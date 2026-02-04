import joblib
import os
import sys

# Define dummy class to satisfy pickle (same as in predictor.py)
class InferenceModel:
    def predict(self, X):
        return self.model.predict(X)

import __main__
if not hasattr(__main__, "InferenceModel"):
    setattr(__main__, "InferenceModel", InferenceModel)

def inspect():
    try:
        model_path = "models/inference_model.pkl"
        if not os.path.exists(model_path):
            print(f"Model not found at {model_path}")
            return

        model = joblib.load(model_path)
        print(f"Model loaded: {type(model)}")
        
        if hasattr(model, 'feature_name_'):
            print("Feature names:", model.feature_name_)
        elif hasattr(model, 'booster_'):
            print("Feature names (booster):", model.booster_.feature_name())
        elif hasattr(model, 'n_features_in_'):
             print(f"Number of features: {model.n_features_in_}")
             if hasattr(model, 'feature_names_in_'):
                 print("Feature names:", model.feature_names_in_)
        else:
            print("Could not find feature names on model object")
            print(dir(model))

    except Exception as e:
        print(f"Error: {e}")

if __name__ == "__main__":
    inspect()
