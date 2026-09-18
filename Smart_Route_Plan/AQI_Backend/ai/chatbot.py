import json
import os
from datetime import datetime, timezone
from typing import Any, Optional

from services.prediction_service import predict_aqi
from services.recommendation_service import recommend_route
from services.weather_service import get_weather_data


SYSTEM_INSTRUCTION = """You are ArogyaRoute's environmental intelligence assistant.
Answer concisely using only data returned by the project tools. Never invent AQI,
weather, route, or forecast values. Clearly label values as current or predicted
and include the forecast time. Give general environmental guidance, not medical
diagnoses. For health-sensitive users, recommend reducing exposure and consulting
a healthcare professional for medical advice. If data is unavailable, say so."""


def _category(aqi: float) -> str:
    if aqi <= 50:
        return "Good"
    if aqi <= 100:
        return "Moderate"
    if aqi <= 150:
        return "Unhealthy for sensitive groups"
    if aqi <= 200:
        return "Unhealthy"
    if aqi <= 300:
        return "Very unhealthy"
    return "Hazardous"


def _location(user: Any, latitude: Optional[float], longitude: Optional[float]):
    location = getattr(user, "location", None)
    return (
        latitude or getattr(location, "latitude", None) or 12.9716,
        longitude or getattr(location, "longitude", None) or 77.5946,
        getattr(location, "city", None) or "Bengaluru",
    )


def get_current_aqi(db, user, latitude=None, longitude=None):
    lat, lon, city = _location(user, latitude, longitude)
    predicted, features = predict_aqi(db, city, lat, lon, datetime.now(timezone.utc))
    live = float(features.get("live_aqi", 0) or 0)
    aqi = round(max(predicted, live))
    return {
        "city": city,
        "aqi": aqi,
        "category": _category(aqi),
        "predicted_aqi": round(predicted),
        "live_aqi": round(live),
        "pm25": features.get("pm25"),
        "pm10": features.get("pm10"),
        "dominant_pollutant": "PM2.5" if (features.get("pm25", 0) or 0) >= (features.get("pm10", 0) or 0) else "PM10",
        "observed_at": datetime.now(timezone.utc).isoformat(),
    }


def get_aqi_forecast(db, user, latitude=None, longitude=None, hours_ahead=1):
    lat, lon, city = _location(user, latitude, longitude)
    now = datetime.now(timezone.utc)
    current, _ = predict_aqi(db, city, lat, lon, now)
    target = now.replace(minute=0, second=0, microsecond=0)
    points = []
    for offset in range(max(1, min(int(hours_ahead), 24)) + 1):
        when = target.replace(hour=(target.hour + offset) % 24)
        value, features = predict_aqi(db, city, lat, lon, when)
        points.append({"time": when.isoformat(), "predicted_aqi": round(value), "pm25": features.get("pm25")})
    return {"city": city, "current_aqi": round(current), "forecast": points}


def get_weather(db, user, latitude=None, longitude=None):
    lat, lon, city = _location(user, latitude, longitude)
    data = get_weather_data(lat, lon)
    return {
        "city": city,
        "temperature_c": data.get("ambient_temperature"),
        "humidity_percent": data.get("relative_humidity"),
        "wind_kmh": data.get("wind_speed"),
        "visibility_km": data.get("visibility"),
        "rain": data.get("rain"),
    }


def get_user_exposure(user):
    conditions = [item.condition.condition_name for item in getattr(user, "health_conditions", [])]
    return {"age": user.age, "health_conditions": conditions, "sensitivity": "higher" if conditions or user.age <= 12 or user.age >= 60 else "standard"}


def get_route_pollution(db, user, source: str, destination: str, start_time=None):
    conditions = [item.condition.condition_name for item in getattr(user, "health_conditions", [])]
    result = recommend_route(
        db=db,
        source=source,
        destination=destination,
        profile_id=user.profile_id,
        start_time=start_time or datetime.now(timezone.utc),
        age=user.age,
        health_conditions=conditions,
    )
    return {
        "source": source,
        "destination": destination,
        "routes": [
            {
                "name": "Recommended route" if index == 0 else f"Alternative {index}",
                "duration_min": round(route.get("duration_seconds", 0) / 60),
                "distance_km": round(route.get("distance_meters", 0) / 1000, 1),
                "average_aqi": round(route.get("route_aqi_score", 0)),
                "exposure": _category(route.get("route_aqi_score", 0)),
            }
            for index, route in enumerate(result.get("all_routes", []))
        ],
    }


def _fallback_answer(question: str, tools: dict[str, Any]) -> str:
    current = tools.get("current_aqi")
    forecast = tools.get("forecast")
    weather = tools.get("weather")
    route = tools.get("route_pollution")
    lower = question.lower()
    if route and route.get("routes"):
        routes = sorted(route["routes"], key=lambda item: item["average_aqi"])
        best = routes[0]
        return f"{best['name']} has the lowest predicted pollution at AQI {best['average_aqi']} ({best['exposure']}). It takes about {best['duration_min']} minutes and covers {best['distance_km']} km."
    if forecast and forecast.get("forecast"):
        item = forecast["forecast"][-1]
        forecast_time = datetime.fromisoformat(item["time"])
        display_hour = forecast_time.hour % 12 or 12
        return f"At {display_hour} {forecast_time.strftime('%p')}, the predicted AQI in {forecast['city']} is {item['predicted_aqi']} ({_category(item['predicted_aqi'])})."
    if current:
        answer = f"The current AQI near {current['city']} is {current['aqi']} ({current['category']})."
        if current.get("dominant_pollutant"):
            answer += f" {current['dominant_pollutant']} is the dominant pollutant in the available model inputs."
        if "run" in lower or "exercise" in lower or "travel" in lower:
            answer += " Consider a shorter or indoor activity when pollution is elevated, especially if you are sensitive to air pollution."
        return answer
    if weather:
        return f"In {weather['city']}, it is {weather.get('temperature_c')}°C with {weather.get('humidity_percent')}% humidity and wind around {weather.get('wind_kmh')} km/h."
    return "I need a location or route details to check the project's environmental data."


def answer_question(db, user, question, latitude=None, longitude=None, source=None, destination=None, language="en-IN"):
    tools = {}
    lower = question.lower()
    if any(word in lower for word in ("route", "road", "pollution exposure", "less pollution")) and source and destination:
        tools["route_pollution"] = get_route_pollution(db, user, source, destination)
    elif any(word in lower for word in ("weather", "temperature", "humidity", "wind", "rain")):
        tools["weather"] = get_weather(db, user, latitude, longitude)
    elif any(word in lower for word in ("forecast", "later", "7 pm", "at ", "predict")):
        tools["forecast"] = get_aqi_forecast(db, user, latitude, longitude, 6)
    else:
        tools["current_aqi"] = get_current_aqi(db, user, latitude, longitude)

    api_key = os.getenv("GEMINI_API_KEY")
    if not api_key:
        return {"answer": _fallback_answer(question, tools), "tools_used": list(tools), "data": tools, "language": language}

    try:
        from google import genai
        client = genai.Client(api_key=api_key)
        prompt = f"{SYSTEM_INSTRUCTION}\n\nProject tool data:\n{json.dumps(tools, default=str)}\n\nUser question: {question}"
        response = client.models.generate_content(model=os.getenv("GEMINI_MODEL", "gemini-2.5-flash"), contents=prompt)
        answer = response.text
        return {"answer": answer, "tools_used": list(tools), "data": tools, "language": language}
    except Exception:
        answer = _fallback_answer(question, tools)
        return {"answer": answer, "tools_used": list(tools), "data": tools, "language": language}