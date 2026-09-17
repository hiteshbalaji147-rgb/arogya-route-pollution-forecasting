"""Location features for the CatBoost model.

The original model was trained with LabelEncoder-generated city/state fields,
but the fitted encoders were not included with the supplied model artifacts.
For unknown labels, use the training median—not zero—so input remains inside
the trained feature distribution. Add exact trained LabelEncoder mappings to
`ml_models/location_encodings.json` later when the training data is available.
"""
import json
from pathlib import Path
from services.model_loader import feature_defaults

_path = Path(__file__).resolve().parent.parent / "ml_models" / "location_encodings.json"
if _path.exists():
    with _path.open(encoding="utf-8") as file:
        ENCODINGS = json.load(file)
else:
    ENCODINGS = {"cities": {}, "states": {}}

def _normalise(value: str) -> str:
    return " ".join((value or "").strip().casefold().split())

def location_features(city: str | None, state: str | None) -> dict:
    city_value = ENCODINGS.get("cities", {}).get(_normalise(city))
    state_value = ENCODINGS.get("states", {}).get(_normalise(state))
    return {
        "city_encoded": float(city_value if city_value is not None else feature_defaults["city_encoded"]),
        "state_encoded": float(state_value if state_value is not None else feature_defaults["state_encoded"]),
    }
