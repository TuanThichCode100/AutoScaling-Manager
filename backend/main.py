from fastapi import FastAPI, UploadFile, File, WebSocket, WebSocketDisconnect, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from fastapi.responses import FileResponse
import pandas as pd
import io
import asyncio
import logging
import os
from models.predictor import RPSEstimator
from database import InfluxDBWrapper

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

app = FastAPI()

# CORS configuration
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Initialize Services
db = InfluxDBWrapper()
predictor = RPSEstimator() # Mock for now

@app.get("/api/health")
def health_check():
    return {"status": "ok"}

@app.post("/api/upload")
async def upload_file(file: UploadFile = File(...)):
    """
    Upload a parquet or csv file, run inference, and store in InfluxDB.
    """
    try:
        contents = await file.read()
        if file.filename.endswith('.parquet'):
            df = pd.read_parquet(io.BytesIO(contents))
        elif file.filename.endswith('.csv'):
            df = pd.read_csv(io.BytesIO(contents))
        else:
            raise HTTPException(status_code=400, detail="Invalid file format")
        
        # 1. Handle Timestamp
        # Strategies: 
        # - If 'timestamp' col exists, use it.
        # - If index is datetime, reset index to col.
        # - If missing, error out or (for now) auto-generate.
        
        if isinstance(df.index, pd.DatetimeIndex):
            df.reset_index(inplace=True)
            if 'index' in df.columns:
                 df.rename(columns={'index': 'timestamp'}, inplace=True)

        if 'timestamp' not in df.columns:
            # Check for common variations like 'time', 'date'
            for col in ['time', 'date', 'ts']:
                if col in df.columns:
                    df.rename(columns={col: 'timestamp'}, inplace=True)
                    break
        
        if 'timestamp' not in df.columns:
             # Fallback: Auto-generate timestamps starting from now (UTC)
             logger.warning("No timestamp column found. Auto-generating timestamps.")
             df['timestamp'] = pd.date_range(start=pd.Timestamp.now(tz='UTC'), periods=len(df), freq='S')
        else:
            # Ensure datetime format and UTC
            df['timestamp'] = pd.to_datetime(df['timestamp'], utc=True)

        # 2. Run Prediction
        # Helper to ensure we don't pass 'timestamp' or 'actual_rps' as features if model doesn't expect them?
        # Predictor logic should ideally handle this, but passing full DF is okay if model ignores extra cols.
        predictions = predictor.predict(df)
        df['predicted_rps'] = predictions
        
        # 3. Write to InfluxDB
        db.write_inference_results(df, file.filename)
        
        # Calculate summary stats for response
        summary = {
            "rows": len(df),
            "min_pred": float(df['predicted_rps'].min()),
            "max_pred": float(df['predicted_rps'].max()),
            "mean_pred": float(df['predicted_rps'].mean())
        }
        
        return {"message": "File processed successfully", "summary": summary}
    except Exception as e:
        logger.error(f"Upload failed: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@app.get("/api/history")
def get_history(range: str = "1h"):
    """
    Get historical data.
    """
    # Map range to flux duration
    range_map = {
        "1h": "-1h",
        "6h": "-6h",
        "24h": "-24h"
    }
    flux_range = range_map.get(range, "-1h")
    data = db.get_history(flux_range)
    return data

@app.websocket("/ws/live")
async def websocket_endpoint(websocket: WebSocket):
    await websocket.accept()
    logger.info("connection open")
    try:
        while True:
            # Mocking live data for smooth UI demo
            import random
            from datetime import datetime
            
            mock_point = {
                "timestamp": datetime.now().isoformat(),
                "predicted_rps": 100 + random.random() * 50,
                "actual_rps": 100 + random.random() * 40
            }
            
            await websocket.send_json(mock_point)
            await asyncio.sleep(1) # 1 second update
            
    except WebSocketDisconnect:
        logger.info("Client disconnected")
    except Exception as e:
        logger.error(f"WebSocket error: {e}")
        try:
            await websocket.close()
        except:
            pass

frontend_dist = os.path.join(os.path.dirname(__file__), "..", "frontend", "dist")
if os.path.exists(frontend_dist):
    app.mount("/assets", StaticFiles(directory=os.path.join(frontend_dist, "assets")), name="assets")
    
    @app.get("/{full_path:path}")
    async def serve_frontend(full_path: str):
        file_path = os.path.join(frontend_dist, full_path)
        if os.path.isfile(file_path):
            return FileResponse(file_path)
        return FileResponse(os.path.join(frontend_dist, "index.html"))
