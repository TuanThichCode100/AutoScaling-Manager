import pandas as pd
import numpy as np
import logging
import sys
import os

# Ensure backend dir is in path
sys.path.append(os.path.join(os.getcwd(), 'backend'))

from backend.models.predictor import RPSEstimator

# Mock logging
logging.basicConfig(level=logging.INFO)

def test_pipeline():
    print("--- Testing RPSEstimator ---")
    # 1. Initialize
    # Note: This expects existing .pkl files in backend/models/
    # If using absolute path in Docker, code uses relative 'models'
    # We might need to adjust path for this script if run from root
    
    models_dir = "backend/models"
    if not os.path.exists(models_dir):
        print(f"Directory {models_dir} not found. Creating mock models for testing...")
        os.makedirs(models_dir, exist_ok=True)
        # Create dummy models if they don't exist
        import joblib
        from sklearn.dummy import DummyRegressor
        
        dummy = DummyRegressor(strategy="constant", constant=100)
        dummy.fit([[0]], [100])
        joblib.dump(dummy, os.path.join(models_dir, "inference_model.pkl"))
        joblib.dump(dummy, os.path.join(models_dir, "lgbm_residual_model.pkl"))

    predictor = RPSEstimator(models_dir=models_dir)
    
    # 2. Create Dummy Data
    df = pd.DataFrame({
        'feature1': np.random.rand(10),
        'feature2': np.random.rand(10)
    })
    
    # 3. Predict
    try:
        preds = predictor.predict(df)
        print(f"Predictions type: {type(preds)}")
        print(f"Predictions shape: {preds.shape}")
        print(f"Sample predictions: {preds[:5]}")
        
        assert len(preds) == 10
        assert not np.isnan(preds).any()
        print("✅ RPSEstimator Test Passed")
    except Exception as e:
        print(f"❌ RPSEstimator Test Failed: {e}")

if __name__ == "__main__":
    test_pipeline()
