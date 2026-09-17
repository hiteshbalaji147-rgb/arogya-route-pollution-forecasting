from pathlib import Path
from catboost import CatBoostRegressor
import joblib

BASE_DIR = Path(__file__).resolve().parent.parent

MODEL_DIR = BASE_DIR / "ml_models"

catboost_model = CatBoostRegressor()
catboost_model.load_model(MODEL_DIR / "catboost_model.cbm")

robust_scaler = joblib.load(
    MODEL_DIR / "robust_scaler.pkl"
)

selected_features = joblib.load(
    MODEL_DIR / "selected_features.pkl"
)

# RobustScaler's centre is the training median for each feature.  It is the
# safest fallback for features for which the inference request has no genuine
# observed value (especially AQI lag/rolling features).
feature_defaults = dict(zip(selected_features, robust_scaler.center_))

print("CatBoost loaded")
print("RobustScaler loaded")
print(f"{len(selected_features)} features loaded")
