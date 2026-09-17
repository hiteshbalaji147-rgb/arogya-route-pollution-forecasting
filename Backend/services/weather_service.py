import requests
from datetime import datetime, timezone

from config import OPENWEATHER_API_KEY
from math import floor

def _sub_index(concentration, breakpoints):
    """US EPA AQI sub-index for one pollutant concentration."""
    for c_low, c_high, i_low, i_high in breakpoints:
        if c_low <= concentration <= c_high:
            return round(((i_high - i_low) / (c_high - c_low)) * (concentration - c_low) + i_low)
    # EPA's final breakpoint is 500. Keep extreme API values bounded for UI/API output.
    return 500 if concentration > breakpoints[-1][1] else 0

def calculate_us_aqi(pm25, pm10):
    """Calculate a live US AQI comparable to IQAir from OpenWeather values."""
    # EPA AQI convention: PM2.5 is truncated to one decimal and PM10 to an int.
    pm25 = floor(float(pm25) * 10) / 10
    pm10 = floor(float(pm10))
    pm25_aqi = _sub_index(pm25, [
        (0.0, 12.0, 0, 50), (12.1, 35.4, 51, 100), (35.5, 55.4, 101, 150),
        (55.5, 150.4, 151, 200), (150.5, 250.4, 201, 300), (250.5, 350.4, 301, 400),
        (350.5, 500.4, 401, 500),
    ])
    pm10_aqi = _sub_index(float(pm10), [
        (0, 54, 0, 50), (55, 154, 51, 100), (155, 254, 101, 150),
        (255, 354, 151, 200), (355, 424, 201, 300), (425, 504, 301, 400),
        (505, 604, 401, 500),
    ])
    return max(pm25_aqi, pm10_aqi)


def get_weather_data(lat: float, lon: float):

    weather_url = (
        f"https://api.openweathermap.org/data/2.5/weather"
        f"?lat={lat}&lon={lon}&appid={OPENWEATHER_API_KEY}&units=metric"
    )

    air_url = (
        f"https://api.openweathermap.org/data/2.5/air_pollution"
        f"?lat={lat}&lon={lon}&appid={OPENWEATHER_API_KEY}"
    )

    weather_response = requests.get(weather_url, timeout=20)
    air_response = requests.get(air_url, timeout=20)
    weather_response.raise_for_status()
    air_response.raise_for_status()
    weather = weather_response.json()
    air = air_response.json()

    pollutants = air["list"][0]["components"]

    pm25 = pollutants["pm2_5"]
    pm10 = pollutants["pm10"]
    live = {
        "aqi": calculate_us_aqi(pm25, pm10),
        # OpenWeather supplies pollutant concentrations, not a station AQI.
        # This is therefore a real-time PM-derived estimate, never a station reading.
        "source": "openweather_pm_derived_us_aqi",
        "station": "OpenWeather Air Pollution grid data",
        "observed_at": datetime.fromtimestamp(air["list"][0]["dt"], tz=timezone.utc).isoformat(),
    }
    return {
        "ambient_temperature": weather["main"]["temp"],
        "relative_humidity": weather["main"]["humidity"],
        "pm25": pm25,
        "pm10": pm10,
        # OpenWeather reports CO in µg/m³; the training pipeline used mg/m³-like values.
        "carbon_monoxide": pollutants["co"] / 1000,
        "nitric_oxide": pollutants["no"],
        "nitrogen_dioxide": pollutants["no2"],
        "nitrogen_oxides": pollutants["no"] + pollutants["no2"],
        "ozone": pollutants["o3"],
        "sulfur_dioxide": pollutants["so2"],
        "ammonia": pollutants["nh3"],

        "rainfall": 0.0,
        "solar_radiation": 0.0,
        "live_aqi": live["aqi"],
        "live_aqi_source": live["source"],
        "live_aqi_station": live["station"],
        "live_aqi_observed_at": live["observed_at"],
        "openweather_aqi_index": air["list"][0].get("main", {}).get("aqi"),
        "live_aqi_is_estimate": True,
    }
