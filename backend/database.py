import os
import pandas as pd
import logging
from datetime import datetime, timedelta

logger = logging.getLogger(__name__)

class InfluxDBWrapper:
    def __init__(self):
        self.data_store = []
        logger.info("Using in-memory data store (InfluxDB not available in Replit)")

    def write_inference_results(self, df: pd.DataFrame, filename: str):
        """
        Write inference results to in-memory store.
        df expected columns: 'timestamp', 'actual_rps' (optional), 'predicted_rps'
        """
        try:
            write_df = df.copy()
            if 'timestamp' in write_df.columns:
                write_df['timestamp'] = pd.to_datetime(write_df['timestamp'], utc=True)
            
            for _, row in write_df.iterrows():
                record = {
                    "timestamp": row.get('timestamp', datetime.now()),
                    "predicted_rps": row.get('predicted_rps'),
                    "actual_rps": row.get('actual_rps'),
                    "filename": filename
                }
                self.data_store.append(record)
            
            logger.info(f"Written {len(write_df)} points to in-memory store")
        except Exception as e:
            logger.error(f"Error writing data: {e}")
            raise e

    def get_history(self, range_str: str = "-1h"):
        """
        Query history data from in-memory store.
        range_str: e.g. "-1h", "-6h", "-24h"
        """
        try:
            hours_map = {"-1h": 1, "-6h": 6, "-24h": 24}
            hours = hours_map.get(range_str, 1)
            cutoff = datetime.now() - timedelta(hours=hours)
            
            results = []
            for record in self.data_store:
                ts = record.get("timestamp")
                if ts and hasattr(ts, 'timestamp'):
                    if ts.replace(tzinfo=None) >= cutoff:
                        results.append(record)
            return results
        except Exception as e:
            logger.error(f"Error querying data: {e}")
            return []
