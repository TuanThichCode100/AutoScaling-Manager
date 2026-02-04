from influxdb_client import InfluxDBClient, Point
from influxdb_client.client.write_api import SYNCHRONOUS
import pandas as pd
import os
import time

# Configuration (Local)
url = "http://localhost:8086"
token = "my-super-secret-auth-token" # From docker-compose/env
org = "my-org"
bucket = "scaleops_metrics"

print(f"Connecting to {url}, org={org}, bucket={bucket}")

try:
    client = InfluxDBClient(url=url, token=token, org=org)
    write_api = client.write_api(write_options=SYNCHRONOUS)
    query_api = client.query_api()
    
    # 1. Test Simple Point Write
    print("Attempting to write a simple point...")
    p = Point("inference_metrics").tag("filename", "test_script.csv").tag("version", "v1").field("predicted_rps", 123.45)
    write_api.write(bucket=bucket, org=org, record=p)
    print("Simple point written.")

    # 2. Test DataFrame Write (simulating database.py)
    print("Attempting to write DataFrame...")
    data = {
        'predicted_rps': [200.0, 210.0, 205.0],
        'actual_rps': [190.0, 200.0, 210.0]
    }
    df = pd.DataFrame(data)
    
    # Create timestamp index (UTC important?)
    df['timestamp'] = pd.date_range(start=pd.Timestamp.utcnow(), periods=len(df), freq='S')
    df.set_index('timestamp', inplace=True)
    
    # Add tags
    df['filename'] = "test_dataframe.parquet"
    df['version'] = "v1"
    
    print("DataFrame to write:")
    print(df)
    
    write_api.write(bucket=bucket, org=org, record=df, 
                    data_frame_measurement_name="inference_metrics",
                    data_frame_tag_columns=["filename", "version"])
    print("DataFrame written.")

    # 3. Query back
    print("Querying data back...")
    time.sleep(1) # Wait for consistency
    query = f'from(bucket: "{bucket}") |> range(start: -10m) |> filter(fn: (r) => r["_measurement"] == "inference_metrics")'
    tables = query_api.query(query, org=org)
    
    count = 0
    for table in tables:
        for record in table.records:
            print(f'Time: {record.get_time()}, Field: {record.get_field()}, Value: {record.get_value()}, Filename: {record.values.get("filename")}')
            count += 1
            
    print(f"Total records found: {count}")

except Exception as e:
    print(f"❌ Error: {e}")
