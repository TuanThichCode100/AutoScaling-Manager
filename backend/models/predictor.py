import pandas as pd
import numpy as np
import logging
import joblib
import os

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

class RPSEstimator:
    def __init__(self, models_dir: str = "models"):
        """
        Initialize the RPSEstimator.
        Loads 'inference_model.pkl' (Base) and 'lgbm_residual_model.pkl' (Residual).
        """
        self.base_model = None
        self.residual_model = None
        
        base_path = os.path.join(models_dir, "inference_model.pkl")
        residual_path = os.path.join(models_dir, "lgbm_residual_model.pkl")

        try:
            if os.path.exists(base_path):
                self.base_model = joblib.load(base_path)
                logger.info(f"Loaded base model from {base_path}")
            else:
                logger.warning(f"Base model not found at {base_path}")
            
            if os.path.exists(residual_path):
                self.residual_model = joblib.load(residual_path)
                logger.info(f"Loaded residual model from {residual_path}")
            else:
                logger.warning(f"Residual model not found at {residual_path}")
                
        except Exception as e:
            logger.error(f"Failed to load models: {e}")

    def predict(self, df: pd.DataFrame) -> np.ndarray:
        """
        Predict RPS based on the input DataFrame.
        Logic: Base Prediction + Residual Prediction
        """
        try:
            if self.base_model is None:
                logger.warning("Base model is missing. Returning zeros.")
                return np.zeros(len(df))

            # Ensure input features match what the model expects
            # (In a real scenario, we might need to select specific columns)
            # For now, we assume raw features are passed or model handles selection
            
            # Base Prediction
            base_pred = self.base_model.predict(df)
            
            # Residual Prediction (if available)
            residual_pred = 0
            if self.residual_model:
                try:
                    residual_pred = self.residual_model.predict(df)
                except Exception as e:
                    logger.warning(f"Residual prediction failed, ignoring: {e}")
            
            final_pred = base_pred + residual_pred
            
            # Ensure no negative values if RPS shouldn't be negative
            final_pred = np.maximum(final_pred, 0)
            
            return final_pred
        except Exception as e:
            logger.error(f"Prediction error: {e}")
            raise e
