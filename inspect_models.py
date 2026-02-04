import pickle
import joblib
import os
import sys

def inspect(filename):
    print(f"--- Inspecting {filename} ---")
    try:
        path = os.path.join("backend/models", filename)
        try:
            obj = joblib.load(path)
            print(f"Loaded with joblib: {type(obj)}")
            if hasattr(obj, 'feature_name_'):
                print(f"Features: {obj.feature_name_}")
            elif hasattr(obj, 'feature_names_in_'):
                print(f"Features: {obj.feature_names_in_}")
        except:
             with open(path, 'rb') as f:
                obj = pickle.load(f)
                print(f"Loaded with pickle: {type(obj)}")
    except Exception as e:
        print(f"Error loading: {e}")

files = [
    "inference_model.pkl",
    "lgbm_residual_model.pkl",
    "model_artifact.pkl"
]

for f in files:
    inspect(f)
