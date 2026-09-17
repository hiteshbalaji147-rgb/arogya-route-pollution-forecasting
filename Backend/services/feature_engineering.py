from datetime import datetime
import math

from services.history_service import get_history_features

def add_temporal_features(features: dict, when=None):

    now = when or datetime.now()

    hour = now.hour
    month = now.month
    day = now.day
    dayofweek = now.weekday()

    features["hour"] = hour
    features["Year"] = now.year
    features["Day"] = day
    features["month"] = month
    features["dayofweek"] = dayofweek

    features["is_weekend"] = int(dayofweek >= 5)

    features["Hour_sin"] = math.sin(
        2 * math.pi * hour / 24
    )

    features["Hour_cos"] = math.cos(
        2 * math.pi * hour / 24
    )

    features["Month_sin"] = math.sin(
        2 * math.pi * month / 12
    )

    features["Month_cos"] = math.cos(
        2 * math.pi * month / 12
    )

    features["DayOfWeek_sin"] = math.sin(
        2 * math.pi * dayofweek / 7
    )

    features["DayOfWeek_cos"] = math.cos(
        2 * math.pi * dayofweek / 7
    )

    return features

def add_ratio_features(features: dict):

    eps = 1e-6

    features["PM25_PM10_Ratio"] = (
        features["pm25"]
        /
        (features["pm10"] + eps)
    )

    features["O3_NO2_Ratio"] = (
        features["ozone"]
        /
        (features["nitrogen_dioxide"] + eps)
    )

    features["CO_NO2_Ratio"] = (
        features["carbon_monoxide"]
        /
        (features["nitrogen_dioxide"] + eps)
    )

    features["NO2_SO2_Ratio"] = (
        features["nitrogen_dioxide"]
        /
        (features["sulfur_dioxide"] + eps)
    )

    return features

def add_interaction_features(features):

    features["Temp_Humidity"] = (
        features["ambient_temperature"]
        *
        features["relative_humidity"]
    )

    features["Humidity_Solar"] = (
        features["relative_humidity"]
        *
        features["solar_radiation"]
    )

    features["pm25_ambient_temperature"] = (
        features["pm25"]
        *
        features["ambient_temperature"]
    )

    features["pm25_relative_humidity"] = (
        features["pm25"]
        *
        features["relative_humidity"]
    )

    features["pm10_relative_humidity"] = (
        features["pm10"]
        *
        features["relative_humidity"]
    )

    features["sulfur_dioxide_ambient_temperature"] = (
        features["sulfur_dioxide"]
        *
        features["ambient_temperature"]
    )

    features["nitrogen_dioxide_solar_radiation"] = (
        features["nitrogen_dioxide"]
        *
        features["solar_radiation"]
    )

    return features

from services.weather_service import get_weather_data
from services.location_encoding import location_features


def build_feature_vector(
    db,
    city,
    latitude,
    longitude,
    when=None,
    state=None
):

    features = get_weather_data(
        latitude,
        longitude
    )

    features = add_temporal_features(
        features,
        when
    )

    features = add_ratio_features(
        features
    )

    features = add_interaction_features(
        features
    )

    history = get_history_features(
        db,
        city
    )

    features.update(history)
    features.update(location_features(city, state))

    return features
