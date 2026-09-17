import pandas as pd

from services.model_loader import (
    catboost_model,
    robust_scaler,
    selected_features
)

from services.feature_engineering import (
    build_feature_vector
)



def predict_aqi(
    db,
    city: str,
    latitude: float,
    longitude: float,
    when=None,
    state=None
):

    # Build all features
    features = build_feature_vector(
        db,
        city,
        latitude,
        longitude,
        when,
        state
    )

    # Create DataFrame
    df = pd.DataFrame([features])

    # Missing values must use training medians, never zero. Zero was outside
    # the training distribution for required city/state and AQI-history fields.
    from services.model_loader import feature_defaults
    for feature in selected_features:
        if feature not in df.columns:
            df[feature] = feature_defaults[feature]
    df = df.fillna(feature_defaults)

    # Arrange columns exactly like training
    df = df[selected_features]

    # Scale features
    scaled = robust_scaler.transform(df)

    # Predict AQI
    prediction = catboost_model.predict(scaled)

    prediction = float(prediction[0])

    return prediction, features
