# ScaleOps Dashboard

## Overview
A high-fidelity React frontend prototype for monitoring Machine Learning model performance in RPS (Requests Per Second) scaling scenarios. The application features a FastAPI backend with data processing capabilities.

## Architecture

### Frontend (React + Vite + TypeScript)
- **Port**: 5000
- **Location**: `frontend/`
- **Key Technologies**: React 19, Vite 6, Recharts, Lucide Icons, Tailwind CSS
- **Features**:
  - Real-time RPS monitoring with auto-refresh
  - Historical data views (1H/6H/24H)
  - Multi-model comparison (LightGBM + EMWA, LightGBM)
  - File upload for data processing (.parquet, .csv, .json)
  - Anomaly detection visualization

### Backend (Python FastAPI)
- **Port**: 8000
- **Location**: `backend/`
- **Key Technologies**: FastAPI, Pandas, scikit-learn, LightGBM
- **Endpoints**:
  - `GET /api/health` - Health check
  - `POST /api/upload` - Upload parquet/csv files for inference
  - `GET /api/history` - Get historical data (1h, 6h, 24h)
  - `WS /ws/live` - WebSocket for real-time data streaming

### Data Storage
- Uses in-memory storage (original project used InfluxDB via Docker)
- Data is stored temporarily during the session

## Project Structure
```
├── backend/
│   ├── main.py           # FastAPI application
│   ├── database.py       # Data storage wrapper
│   ├── models/
│   │   └── predictor.py  # ML model inference
│   └── requirements.txt
├── frontend/
│   ├── App.tsx           # Main React component
│   ├── components/       # React components
│   ├── vite.config.ts    # Vite configuration (port 5000)
│   └── package.json
└── docker-compose.yml    # Original Docker setup (not used in Replit)
```

## Running the Application
- **Frontend**: Runs on port 5000 via `npm run dev`
- **Backend**: Runs on port 8000 via `uvicorn`

## Notes
- Original project used InfluxDB via Docker for time-series data storage
- Replit version uses in-memory storage as a substitute
- WebSocket connections work through the Vite proxy in development
