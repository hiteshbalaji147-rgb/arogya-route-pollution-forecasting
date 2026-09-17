from datetime import datetime

import numpy as np

from sqlalchemy.orm import Session

from database.models import AQIHistory
from services.model_loader import feature_defaults

def save_prediction(
    db: Session,
    city: str,
    latitude: float,
    longitude: float,
    predicted_aqi: float
):

    prediction = AQIHistory(
        city=city,
        latitude=latitude,
        longitude=longitude,
        predicted_aqi=predicted_aqi,
        prediction_time=datetime.utcnow()
    )

    db.add(prediction)

    db.commit()

    db.refresh(prediction)

    return prediction

def get_city_history(
    db: Session,
    city: str,
    limit: int = 100
):

    return (
        db.query(AQIHistory)
        .filter(AQIHistory.city == city)
        .order_by(
            AQIHistory.prediction_time.desc()
        )
        .limit(limit)
        .all()
    )

def calculate_lag_features(history):

    values = [
        row.predicted_aqi
        for row in history
    ]

    def get_lag(index):

        if len(values) > index:
            return values[index]

        elif values:
            return values[-1]

        return 0

    return {

        "calculated_aqi_lag_1": get_lag(0),

        "calculated_aqi_lag_24": get_lag(23),

        "calculated_aqi_lag_48": get_lag(47),

        "calculated_aqi_lag_72": get_lag(71)

    }

def calculate_rolling_features(history):

    values = np.array(
        [
            row.predicted_aqi
            for row in history
        ]
    )

    if len(values) == 0:

        return {

            "calculated_aqi_rolling_std_3": 0,

            "calculated_aqi_rolling_std_6": 0,

            "calculated_aqi_rolling_std_12": 0,

            "calculated_aqi_rolling_std_24": 0,

            "calculated_aqi_expanding_mean": 0

        }

    def rolling_std(window):

        if len(values) >= window:

            return float(
                np.std(
                    values[:window]
                )
            )

        return float(
            np.std(values)
        )

    return {

        "calculated_aqi_rolling_std_3": rolling_std(3),

        "calculated_aqi_rolling_std_6": rolling_std(6),

        "calculated_aqi_rolling_std_12": rolling_std(12),

        "calculated_aqi_rolling_std_24": rolling_std(24),

        "calculated_aqi_expanding_mean": float(
            np.mean(values)
        )

    }

def get_history_features(
    db: Session,
    city: str
):
    # aqI_history currently contains model outputs, not independently observed
    # AQI measurements. Feeding predictions back as lags creates a feedback
    # loop and makes route results depend on earlier API calls. Use the model's
    # training medians until a genuine timestamped observation data source is
    # introduced.
    keys = [
        "calculated_aqi_lag_1", "calculated_aqi_lag_24",
        "calculated_aqi_lag_48", "calculated_aqi_lag_72",
        "calculated_aqi_rolling_std_3", "calculated_aqi_rolling_std_6",
        "calculated_aqi_rolling_std_12", "calculated_aqi_rolling_std_24",
        "calculated_aqi_expanding_mean",
    ]
    return {key: float(feature_defaults[key]) for key in keys}
