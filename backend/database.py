import os
import pandas as pd
import logging
from datetime import datetime, timedelta
from influxdb_client import InfluxDBClient, Point, WriteOptions
from influxdb_client.client.write_api import SYNCHRONOUS

logger = logging.getLogger(__name__)

class InfluxDBWrapper:
    def __init__(self):
        self.url = os.getenv("INFLUXDB_URL", "http://influxdb:8086")
        self.token = os.getenv("INFLUXDB_TOKEN", "my-super-secret-auth-token")
        self.org = os.getenv("INFLUXDB_ORG", "my-org")
        self.bucket = os.getenv("INFLUXDB_BUCKET", "my-bucket")
        
        try:
            self.client = InfluxDBClient(url=self.url, token=self.token, org=self.org)
            self.write_api = self.client.write_api(write_options=SYNCHRONOUS)
            self.query_api = self.client.query_api()
            logger.info(f"Connected to InfluxDB at {self.url}")
        except Exception as e:
            logger.error(f"Failed to connect to InfluxDB: {e}")
            self.client = None

    def write_inference_results(self, df: pd.DataFrame, filename: str):
        """
        Write inference results to InfluxDB.
        df expected columns: 'timestamp', 'actual', 'model1', 'model2'
        """
        if not self.client:
            logger.warning("InfluxDB client not initialized, skipping write")
            return

        try:
            write_df = df.copy()
            if 'timestamp' in write_df.columns:
                write_df['timestamp'] = pd.to_datetime(write_df['timestamp'], utc=True)
            
            points = []
            for _, row in write_df.iterrows():
                # Use current time if timestamp is missing or null
                ts = row.get('timestamp')
                if pd.isna(ts):
                    ts = datetime.utcnow()
                
                point = Point("inference_metrics") \
                    .tag("filename", filename) \
                    .time(ts)
                
                # Add actual value if present
                if 'actual' in row and not pd.isna(row['actual']):
                    point.field("actual", float(row['actual']))
                
                # Add model1 prediction
                if 'model1' in row and not pd.isna(row['model1']):
                    point.field("model1", float(row['model1']))

                # Add model2 prediction
                if 'model2' in row and not pd.isna(row['model2']):
                    point.field("model2", float(row['model2']))
                
                points.append(point)
            
            if points:
                self.write_api.write(bucket=self.bucket, org=self.org, record=points)
                logger.info(f"Written {len(points)} points to InfluxDB")
            
        except Exception as e:
            logger.error(f"Error writing data to InfluxDB: {e}")
            raise e

    def get_history(self, range_str: str = "-1h"):
        """
        Query history data from InfluxDB.
        range_str: e.g. "-1h", "-6h", "-24h"
        """
        if not self.client:
            logger.warning("InfluxDB client not initialized, returning empty history")
            return []

        try:
            # Map simplified range strings to Flux duration syntax if needed, 
            # or just rely on them being valid Flux durations (e.g. -1h is valid).
            # Flux start parameter usually takes e.g. -1h
            
            # Temporarily hardcode a broad range for debugging the 1995 data
            start_range = "-100d" 
            # Original line was: start_range = range_str if range_str.startswith("-") else f"-{range_str}"
            
            query = f'''
            from(bucket: "{self.bucket}")
              |> range(start: {start_range})
              |> filter(fn: (r) => r["_measurement"] == "inference_metrics")
              |> filter(fn: (r) => r["_field"] == "actual" or r["_field"] == "model1" or r["_field"] == "model2")
              |> pivot(rowKey:["_time"], columnKey: ["_field"], valueColumn: "_value")
              |> sort(columns: ["_time"], desc: false)
            '''
            
            tables = self.query_api.query(query, org=self.org)
            results = []
            
            for table in tables:
                for record in table.records:
                    results.append({
                        "time": record.get_time().isoformat(), # Frontend expects 'time' string
                        "actual": record.values.get("actual"),
                        "model1": record.values.get("model1"),
                        "model2": record.values.get("model2"),
                        # "filename": record.values.get("filename") # Removed filename as frontend doesn't use it in ChartDataPoint
                    })
            
            return results
        except Exception as e:
            logger.error(f"Error querying data from InfluxDB: {e}")
            return []
