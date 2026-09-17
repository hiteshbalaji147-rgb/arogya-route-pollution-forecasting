from services.routing_service import get_routes
from services.route_sampling import sample_route_points
from services.prediction_service import predict_aqi
from services.health_service import aqi_category, health_risk_score

def evaluate_route(
    db,
    city,
    route,
    start_time
):

    geometry = route["geometry"]

    sampled_points = sample_route_points(
        geometry
    )

    predictions = []
    live_aqis = []
    live_observations = []

    for index, (latitude, longitude) in enumerate(sampled_points):

        prediction, features = predict_aqi(
            db,
            city,
            latitude,
            longitude,
            start_time + __import__("datetime").timedelta(seconds=route["duration"] * index / max(len(sampled_points) - 1, 1))
        )

        predictions.append(prediction)
        live_aqis.append(features["live_aqi"])
        live_observations.append({
            "latitude": latitude,
            "longitude": longitude,
            "live_aqi": features["live_aqi"],
            "source": features["live_aqi_source"],
            "station": features["live_aqi_station"],
            "observed_at": features["live_aqi_observed_at"],
            "pm25_ug_m3": features["pm25"],
            "pm10_ug_m3": features["pm10"],
            "is_pm_derived_estimate": features["live_aqi_is_estimate"],
        })

    average_aqi = (
        sum(predictions) / len(predictions)
        if predictions
        else 0
    )

    live_average = sum(live_aqis) / len(live_aqis) if live_aqis else 0
    # The model was trained to predict AQI. OpenWeather's PM estimate is retained
    # as current-observation context, but cannot be presented as a station AQI.
    route_aqi_score = max(average_aqi, live_average)
    return {

        "distance_meters": route["distance"],
        "duration_seconds": route["duration"],
        "average_model_predicted_aqi": average_aqi,
        "peak_model_predicted_aqi": max(predictions) if predictions else 0,
        "average_live_aqi": live_average,
        "live_aqi_description": "Real-time OpenWeather PM2.5/PM10-derived US AQI estimate (not a station measurement)",
        "route_aqi_score": route_aqi_score,
        "aqi_category": aqi_category(route_aqi_score),
        "peak_live_aqi": max(live_aqis) if live_aqis else 0,
        "sample_points": len(sampled_points),
        "waypoint_model_predicted_aqi": predictions,
        "waypoint_live_aqi": live_aqis,
        "waypoint_live_observations": live_observations,

    }

def recommend_route(
    db,
    source,
    destination,
    profile_id,
    start_time,
    age,
    health_conditions,
):

    routes = get_routes(
        source,
        destination
    )

    results = []

    for route in routes:

        evaluated_route = evaluate_route(db, source, route, start_time)
        evaluated_route["health_risk_score"] = health_risk_score(
            evaluated_route["route_aqi_score"],
            evaluated_route["peak_model_predicted_aqi"],
            age,
            health_conditions,
        )
        results.append(evaluated_route)

    best_route = min(
        results,
        key=lambda x: (x["health_risk_score"], x["route_aqi_score"], x["average_model_predicted_aqi"])
    )

    return {

        "profile_id": profile_id,
        "source": source,
        "destination": destination,
        "start_time": start_time,
        "end_time": start_time + __import__("datetime").timedelta(seconds=best_route["duration_seconds"]),
        "recommendation_basis": "lowest health-aware AQI risk score, using CatBoost AQI predictions and real-time OpenWeather PM-derived estimates",
        "candidate_routes_count": len(results),
        "recommended_route": best_route,
        "all_routes": results

    }
