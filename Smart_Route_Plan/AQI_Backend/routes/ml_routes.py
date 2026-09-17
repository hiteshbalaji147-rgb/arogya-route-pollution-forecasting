from fastapi import APIRouter
from services.model_loader import selected_features
from services.prediction_service import predict_aqi
from services.routing_service import get_routes
from services.route_sampling import sample_route_points
from database.postgres import get_db
from sqlalchemy.orm import Session

from fastapi import Depends

from services.history_service import (
    save_prediction,
    get_history_features
)
router = APIRouter(
    prefix="/ml",
    tags=["Machine Learning"]
)


@router.get("/status")
def model_status():

    return {
        "model": "Loaded",
        "selected_features": len(selected_features)
    }


@router.get("/feature-list")
def feature_list():

    return {
        "features": selected_features
    }


from services.weather_service import get_weather_data

@router.get("/weather-test")
def weather_test():

    # Bangalore coordinates
    return get_weather_data(
        12.9716,
        77.5946
    )

from services.routing_service import get_routes


@router.get("/route-test")
def route_test():

    return get_routes(
        "Whitefield, Bangalore",
        "Electronic City, Bangalore"
    )

@router.get("/sample-test")
def sample_test():

    routes = get_routes(
        "Whitefield, Bangalore",
        "Electronic City, Bangalore"
    )
    first_route = routes[0]
    geometry = first_route["geometry"]
    sampled = sample_route_points(
    geometry
)
    return {
    "total_points": len(geometry),
    "sampled_points": len(sampled),
    "points": sampled
}

@router.get("/history-test")
def history_test(
    db: Session = Depends(get_db)
):

    save_prediction(
        db,
        city="Bangalore",
        latitude=12.9716,
        longitude=77.5946,
        predicted_aqi=120
    )

    return get_history_features(
        db,
        "Bangalore"
    )
from services.feature_engineering import (
    build_feature_vector
)
@router.get("/feature-vector")
def feature_vector(
    db: Session = Depends(get_db)
):

    return build_feature_vector(

        db,

        city="Bangalore",

        latitude=12.9716,

        longitude=77.5946

    )
@router.get("/predict-test")
def predict_test(
    db: Session = Depends(get_db)
):

    prediction, features = predict_aqi(

        db,

        city="Bangalore",

        latitude=12.9716,

        longitude=77.5946

    )

    return {

        "predicted_aqi": prediction,

        "features_used": len(features)

    }
