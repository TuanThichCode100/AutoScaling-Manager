import pandas as pd
import numpy as np
import logging
import joblib
import os
import sys

# Define dummy class to satisfy pickle
class InferenceModel:
    def predict(self, X):
        return self.model.predict(X)

# Inject into __main__ so pickle can find it
import __main__
if not hasattr(__main__, "InferenceModel"):
    setattr(__main__, "InferenceModel", InferenceModel)

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

class RPSEstimator:
    WINDOW = "60S" # 1 minute, as defined in the notebook

    def __init__(self, models_dir: str = "models"):
        """
        Initialize the RPSEstimator.
        Loads 'inference_model.pkl' (Base) and 'lgbm_residual_model.pkl' (Residual).
        """
        self.base_model = None
        self.residual_model = None
        self.feature_names = [] # To store expected feature names from the model
        
        base_path = os.path.join(models_dir, "inference_model.pkl")
        residual_path = os.path.join(models_dir, "lgbm_residual_model.pkl")
        artifact_path = os.path.join(models_dir, "model_artifact.pkl") # New artifact path

        try:
            # Try to load feature names from model_artifact.pkl first
            if os.path.exists(artifact_path):
                artifact = joblib.load(artifact_path)
                if 'feature_names' in artifact:
                    self.feature_names = artifact['feature_names']
                    logger.info(f"Loaded feature names from model_artifact.pkl: {self.feature_names}")
                else:
                    logger.warning(f"model_artifact.pkl found at {artifact_path} but does not contain 'feature_names'.")
            else:
                logger.warning(f"model_artifact.pkl not found at {artifact_path}. Will attempt to extract feature names from base model.")

            if os.path.exists(base_path):
                self.base_model = joblib.load(base_path)
                logger.info(f"Loaded base model from {base_path}")

                # If feature names not loaded from artifact, try from base model
                if not self.feature_names:
                    if hasattr(self.base_model, 'booster_'):
                        self.feature_names = self.base_model.booster_.feature_name()
                        logger.info(f"Base model expects features (from booster_.feature_name()): {self.feature_names}")
                    elif hasattr(self.base_model, 'feature_name_'):
                        self.feature_names = self.base_model.feature_name_
                        logger.info(f"Base model expects features (from feature_name_): {self.feature_names}")
                    else:
                        logger.warning("Could not retrieve feature names from base model. Falling back to hardcoded list.")
                        # Fallback to hardcoded list based on top 12 feature importances from notebook
                        self.feature_names = [
                            'ewma_fast', 'ewma_slow', 'lag_5', 'roll_max_5', 'lag_1',
                            'roll_min_5', 'lag_2', 'burst_strength', 'diff_2', 'acceleration',
                            'roll_max_3', 'roll_min_3'
                        ]
                        logger.info(f"Using hardcoded feature names as fallback: {self.feature_names}")

            else:
                logger.warning(f"Base model not found at {base_path}")
            
            if os.path.exists(residual_path):
                self.residual_model = joblib.load(residual_path)
                logger.info(f"Loaded residual model from {residual_path}")
            else:
                logger.warning(f"Residual model not found at {residual_path}")
                
        except Exception as e:
            logger.error(f"Failed to load models or feature names: {e}")

    def _build_request_rate(self, df: pd.DataFrame, window: str = WINDOW) -> pd.DataFrame:
        """
        Build request_rate from raw log data.
        Requires 'timestamp' column.
        """
        df_raw = df.copy()
        if 'timestamp' not in df_raw.columns:
            raise ValueError("Input DataFrame must contain a 'timestamp' column for request rate calculation.")
        
        df_raw['timestamp'] = pd.to_datetime(df_raw['timestamp'])

        rate_df = (
            df_raw
            .set_index("timestamp")
            .resample(window)
            .size()
            .rename("request_rate")
            .reset_index()
        )
        return rate_df

    def _build_baseline(self, rate_df: pd.DataFrame) -> pd.DataFrame:
        """
        Build baseline features (ewma_slow, ewma_fast, baseline, residual).
        Requires 'request_rate' and 'timestamp' columns.
        """
        df = rate_df.sort_values("timestamp").reset_index(drop=True).copy()
        y = df["request_rate"]

        # EWMA slow (long memory)
        df["ewma_slow"] = y.shift(1).ewm(alpha=0.02, adjust=False).mean()

        # EWMA fast (medium memory)
        df["ewma_fast"] = y.shift(1).ewm(alpha=0.15, adjust=False).mean()

        # Combined baseline
        df["baseline"] = 0.7 * df["ewma_slow"] + 0.3 * df["ewma_fast"]

        # Residual
        df["residual"] = y - df["baseline"]

        return df

    def _build_feature(self, rate_df: pd.DataFrame) -> pd.DataFrame:
        """
        Build all the features required by the model from the baseline DataFrame.
        """
        df = self._build_baseline(rate_df)
        r = df["residual"]

        # Short-term memory only
        lags = [1, 2, 3, 5]
        for lag in lags:
            df[f"lag_{lag}"] = r.shift(lag)

        # Volatility & local range
        for win in [3, 5]:
            df[f"roll_std_{win}"] = r.shift(1).rolling(win).std()
            df[f"roll_max_{win}"] = r.shift(1).rolling(win).max()
            df[f"roll_min_{win}"] = r.shift(1).rolling(win).min()

        # Burst dynamics
        df["diff_1"] = r.shift(1) - r.shift(2)
        df["diff_2"] = r.shift(1) - r.shift(3)
        df["acceleration"] = df["diff_1"] - df["diff_2"]
        df["abs_diff_1"] = df["diff_1"].abs()

        # Burst intensity normalized by volatility
        df["burst_strength"] = df["abs_diff_1"] / (df["roll_std_3"] + 1e-5)

        # Range expansion
        df["range_expand"] = df["roll_max_5"] - df["roll_min_5"]

        # Drop rows with NaN values introduced by feature engineering
        df = df.dropna().reset_index(drop=True)

        return df

    def predict(self, df: pd.DataFrame) -> np.ndarray:
        """
        Predict RPS based on the input DataFrame after performing feature engineering.
        The input DataFrame 'df' is expected to contain a 'timestamp' column.
        """
        try:
            if self.base_model is None:
                logger.warning("Base model is missing. Returning zeros.")
                return np.zeros(len(df))

            # Step 1: Build request rate
            rate_df = self._build_request_rate(df)
            logger.info(f"DataFrame after building request rate: {rate_df.shape} columns: {rate_df.columns.tolist()}")

            # Step 2: Build all features
            engineered_df = self._build_feature(rate_df)
            logger.info(f"DataFrame after feature engineering: {engineered_df.shape} columns: {engineered_df.columns.tolist()}")

            # Ensure engineered features match model's expected features
            if not self.feature_names:
                # If feature names couldn't be loaded, try to infer from engineered_df
                # This is a fallback and might not be reliable if engineered_df has extra columns
                logger.warning("Model feature names not explicitly available. Using all engineered features for prediction.")
                X = engineered_df.drop(columns=[col for col in engineered_df.columns if col in ["timestamp", "request_rate", "baseline", "residual"]], errors='ignore')
                self.feature_names = X.columns.tolist() # Update for logging if needed
            else:
                # Select and reorder features to match the model's expected feature names
                missing_features = [f for f in self.feature_names if f not in engineered_df.columns]
                if missing_features:
                    raise ValueError(f"Missing expected features after engineering: {missing_features}")
                
                # Filter out 'timestamp', 'request_rate', 'baseline', 'residual' if they are still present
                # and only select the columns that are in self.feature_names
                X = engineered_df[self.feature_names]

            if X.empty:
                logger.warning("Engineered feature DataFrame is empty after processing. Cannot make predictions.")
                return np.zeros(len(df)) # Return zeros or handle as appropriate

            logger.info(f"Features passed to model ({X.shape[1]}): {X.columns.tolist()}")
            if X.shape[1] != len(self.feature_names) and self.feature_names:
                 raise ValueError(f"Mismatch in feature count. Expected {len(self.feature_names)}, got {X.shape[1]}. Expected: {self.feature_names}, Got: {X.columns.tolist()}")


            # Base Prediction
            base_pred = self.base_model.predict(X)
            
            # Residual Prediction (if available)
            residual_pred_values = np.zeros(len(engineered_df)) # Initialize with zeros, length of engineered_df
            if self.residual_model:
                try:
                    residual_pred_values = self.residual_model.predict(X)
                except Exception as e:
                    logger.warning(f"Residual prediction failed, ignoring: {e}")
            
            final_pred = base_pred + residual_pred_values
            
            # Ensure no negative values if RPS shouldn't be negative
            final_pred = np.maximum(final_pred, 0)
            
            # The 'final_pred' corresponds to the 'engineered_df' after dropping NaNs.
            # We need to align these predictions back to the original 'df' if necessary,
            # but for now, we'll assume 'df' is processed into 'engineered_df' directly.
            # If original 'df' length is needed, this part needs more complex handling (e.g., merging back on timestamp).
            
            # Add predictions to the engineered_df
            engineered_df['model1'] = final_pred # LGBM + EMWA
            engineered_df['model2'] = base_pred  # Just LGBM

            # The 'request_rate' generated by _build_request_rate is the actual measurement for that time window.
            engineered_df['actual'] = engineered_df['request_rate'] # Use request_rate as actual for the time window

            # Return the DataFrame with features and predictions, only selecting columns needed for the frontend.
            return engineered_df[['timestamp', 'actual', 'model1', 'model2']]

        except Exception as e:
            msg = f"Prediction error: {str(e)}"
            
            # Attempt to append expected features to the error message for debugging
            if self.feature_names:
                msg += f" || EXPECTED FEATURES ({len(self.feature_names)}): {self.feature_names}"
            else:
                msg += " || Expected features could not be determined from the model."

            logger.error(msg)
            raise Exception(msg)

