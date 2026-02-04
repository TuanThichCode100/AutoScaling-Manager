import os
from influxdb_client import InfluxDBClient, Point, WritePrecision
from influxdb_client.client.write_api import SYNCHRONOUS
import pandas as pd
import logging

logger = logging.getLogger(__name__)

class InfluxDBWrapper:
    def __init__(self):
        self.url = os.getenv("INFLUXDB_URL", "http://localhost:8086")
        self.token = os.getenv("INFLUXDB_TOKEN", "my-token")
        self.org = os.getenv("INFLUXDB_ORG", "my-org")
        self.bucket = os.getenv("INFLUXDB_BUCKET", "scaleops_metrics")
        
        self.client = InfluxDBClient(url=self.url, token=self.token, org=self.org)
        self.write_api = self.client.write_api(write_options=SYNCHRONOUS)
        self.query_api = self.client.query_api()
        logger.info(f"Connected to InfluxDB at {self.url}")

    def write_inference_results(self, df: pd.DataFrame, filename: str):
        """
        Write inference results to InfluxDB using DataFrame batch write.
        df expected columns: 'timestamp', 'actual_rps' (optional), 'predicted_rps'
        """
        try:
            # Prepare DataFrame for InfluxDB
            # 1. Set timestamp as index
            write_df = df.copy()
            if 'timestamp' in write_df.columns:
                write_df['timestamp'] = pd.to_datetime(write_df['timestamp'], utc=True)
                write_df.set_index('timestamp', inplace=True)
            
            # 2. Add tags
            write_df['filename'] = filename
            write_df['version'] = "v1"
            
            # 3. Select fields to write (keep only numeric fields + tags)
            # Ensure we don't write extra columns that confuse InfluxDB
            allowed_fields = ['predicted_rps', 'actual_rps', 'filename', 'version']
            # Filter columns that exist in df
            cols_to_keep = [c for c in allowed_fields if c in write_df.columns]
            write_df = write_df[cols_to_keep]

            # Write to InfluxDB
            # data_frame_measurement_name specifies the measurement
            # data_frame_tag_columns specifies which columns are tags
            self.write_api.write(bucket=self.bucket, org=self.org, record=write_df, 
                                 data_frame_measurement_name="inference_metrics",
                                 data_frame_tag_columns=["filename", "version"])
            
            logger.info(f"Written {len(write_df)} points to InfluxDB")
        except Exception as e:
            logger.error(f"Error writing to InfluxDB: {e}")
            raise e

    def get_history(self, range_str: str = "-1h"):
        """
        Query history data.
        range_str: e.g. "-1h", "-6h", "-24h"
        """
        query = f'''
        from(bucket: "{self.bucket}")
            |> range(start: {range_str})
            |> filter(fn: (r) => r["_measurement"] == "inference_metrics")
            |> pivot(rowKey:["_time"], columnKey: ["_field"], valueColumn: "_value")
            |> sort(columns: ["_time"])
        '''
        try:
            tables = self.query_api.query(query, org=self.org)
            results = []
            for table in tables:
                for record in table.records:
                    results.append({
                        "timestamp": record.get_time(),
                        "actual_rps": record.values.get("actual_rps"),
                        "predicted_rps": record.values.get("predicted_rps"),
                        "filename": record.values.get("filename")
                    })
            return results
        except Exception as e:
            logger.error(f"Error querying InfluxDB: {e}")
            return []
