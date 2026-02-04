import asyncio
import logging
import json
from typing import List, Optional
from fastapi import FastAPI, UploadFile, File, HTTPException, WebSocket, WebSocketDisconnect
from fastapi.middleware.cors import CORSMiddleware
import pandas as pd
import io

from database import InfluxDBWrapper
from models.predictor import RPSEstimator

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

app = FastAPI(title="ScaleOps Backend", version="1.0.0")

# CORS middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # In production, specify allowed origins
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Initialize components
db = InfluxDBWrapper()
estimator = RPSEstimator()

@app.get("/api/health")
async def health_check():
    return {"status": "ok", "service": "backend"}

@app.post("/api/upload")
async def upload_file(file: UploadFile = File(...)):
    """
    Handle file upload (csv, parquet, json), run inference, and store results.
    """
    try:
        content = await file.read()
        filename = file.filename
        
        # Read file into DataFrame
        if filename.endswith('.csv'):
            df = pd.read_csv(io.BytesIO(content))
        elif filename.endswith('.parquet'):
            df = pd.read_parquet(io.BytesIO(content))
        elif filename.endswith('.json'):
            df = pd.read_json(io.BytesIO(content))
        else:
            raise HTTPException(status_code=400, detail="Unsupported file format")

        logger.info(f"Received file {filename} with shape {df.shape}")

        # Run inference
        try:
            # predictions will now be a DataFrame, not an array
            result_df = estimator.predict(df) 
            # We no longer need this line: df['predicted_rps'] = predictions
            # Instead, result_df already contains 'predicted_rps' and relevant timestamps

            # The 'result_df' now contains the processed data with predictions.
            # We need to decide what to store and return.
            # For now, let's assume result_df is what we want.
            predictions_count = len(result_df) # Get count of actual predictions made
            
        except Exception as e:
            logger.error(f"Inference failed: {e}")
            raise HTTPException(status_code=500, detail=f"Inference failed: {str(e)}")

        # Store results - needs to use result_df
        try:
            db.write_inference_results(result_df, filename) # <--- CHANGE
        except Exception as e:
            logger.error(f"Database write failed: {e}")
            # We don't fail the request if DB write fails, but we log it.
            # Alternatively, raise 500.

        return {
            "status": "success",
            "filename": filename,
            "rows_processed": predictions_count, # <--- CHANGE
            "preview": result_df.head().to_dict(orient="records") # <--- CHANGE
        }

    except HTTPException as he:
        raise he
    except Exception as e:
        logger.error(f"Upload failed: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@app.get("/api/history")
async def get_history(range: str = "-1h"):
    """
    Get historical data from InfluxDB.
    """
    try:
        data = db.get_history(range)
        return data
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

# WebSocket manager
class ConnectionManager:
    def __init__(self):
        self.active_connections: List[WebSocket] = []

    async def connect(self, websocket: WebSocket):
        await websocket.accept()
        self.active_connections.append(websocket)

    def disconnect(self, websocket: WebSocket):
        self.active_connections.remove(websocket)

    async def broadcast(self, message: dict):
        for connection in self.active_connections:
            try:
                await connection.send_json(message)
            except Exception as e:
                logger.error(f"Error sending to websocket: {e}")
                # Connection might be dead, safely ignore or remove

manager = ConnectionManager()

@app.websocket("/ws/live")
async def websocket_endpoint(websocket: WebSocket):
    await manager.connect(websocket)
    try:
        while True:
            # Keep connection alive
            # In a real scenario, this would potentially stream real-time metric updates
            # For now, we just listen for messages or send heartbeats
            await websocket.receive_text()
    except WebSocketDisconnect:
        manager.disconnect(websocket)
    except Exception as e:
        logger.error(f"WebSocket error: {e}")
        manager.disconnect(websocket)

# Background task to simulate live data (Optional, if we want to push data)
# For this prototype, the frontend handles simulation logic, or we can push backend metrics here.
