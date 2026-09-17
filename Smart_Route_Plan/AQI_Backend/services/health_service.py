AQI_THRESHOLDS = (
    (50, "Good", "green"),
    (100, "Moderate", "orange"),
    (150, "Unhealthy for Sensitive Groups", "orange"),
    (200, "Unhealthy", "red"),
    (300, "Very Unhealthy", "red"),
    (float("inf"), "Hazardous", "red"),
)


def aqi_category(aqi: float) -> dict:
    for upper_bound, label, color in AQI_THRESHOLDS:
        if aqi <= upper_bound:
            return {"label": label, "color": color}
    raise AssertionError("unreachable")


def is_age_sensitive(age: int) -> bool:
    """Children and older adults are more sensitive to air pollution exposure."""
    return age <= 12 or age >= 60


def health_risk_score(route_aqi_score: float, peak_predicted_aqi: float, age: int, conditions: list[str]) -> float:
    """Prioritize high AQI peaks for people with higher exposure sensitivity."""
    if is_age_sensitive(age) or conditions:
        # A short high-pollution segment matters more for vulnerable profiles.
        return round(0.7 * route_aqi_score + 0.3 * peak_predicted_aqi, 2)
    return round(route_aqi_score, 2)


def health_advice(aqi: float, conditions: list[str], age: int) -> str:
    category = aqi_category(aqi)["label"]
    sensitive = bool(conditions)
    if category == "Good":
        advice = "Air quality is good; normal outdoor travel is suitable."
    elif category == "Moderate":
        advice = "Air quality is acceptable; unusually sensitive people should reduce prolonged outdoor exertion."
    elif category == "Unhealthy for Sensitive Groups":
        advice = "Sensitive groups should reduce outdoor exertion and keep vehicle windows closed where practical."
    else:
        advice = "Reduce outdoor exposure, keep windows closed where practical, and consider a well-fitting mask during unavoidable outdoor travel."
    if sensitive:
        advice += " Because the profile lists " + ", ".join(conditions) + ", this route is assessed more cautiously."
    if is_age_sensitive(age):
        advice += " Age is also treated as an air-pollution sensitivity factor for this recommendation."
    return advice + " This is general air-quality guidance, not medical advice."
