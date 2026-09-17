from services.sarvam_service import translate_text


def localize_recommendation(result: dict, language: str, conditions: list[str], health_advice: str) -> dict:
    """Return every user-facing route string in the profile's preferred language.

    API field names and numeric measurements remain stable for frontend code;
    the frontend should display this localized object rather than translating
    technical keys such as `route_aqi_score`.
    """
    def translate(value: str) -> str:
        return translate_text(value, language)

    all_routes = []
    for index, route in enumerate(result["all_routes"], start=1):
        all_routes.append({
            "route_number": index,
            "aqi_category": translate(route["aqi_category"]["label"]),
            "summary": translate(
                f"Route {index}: AQI score {round(route['route_aqi_score'])}; "
                f"distance {round(route['distance_meters'] / 1000, 1)} kilometres; "
                f"estimated travel time {round(route['duration_seconds'] / 60)} minutes."
            ),
        })

    recommended = result["recommended_route"]
    return {
        "language": language,
        "source": translate(result["source"]),
        "destination": translate(result["destination"]),
        "recommendation_basis": translate(result["recommendation_basis"]),
        "aqi_data_note": translate(
            "The real-time AQI is an estimate calculated from OpenWeather PM2.5 and PM10 data; it is not a station measurement."
        ),
        "recommended_route": {
            "aqi_category": translate(recommended["aqi_category"]["label"]),
            "summary": translate(
                f"Recommended route AQI score is {round(recommended['route_aqi_score'])}; "
                f"health risk score is {round(recommended['health_risk_score'])}. "
                f"The real-time PM-derived AQI estimate is {round(recommended['average_live_aqi'])}."
            ),
        },
        "all_routes": all_routes,
        "health_conditions": [translate(condition) for condition in conditions],
        "health_advice": health_advice,
    }
