from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from database.postgres import get_db

from services.recommendation_service import recommend_route

router = APIRouter(
    prefix="/route",
    tags=["Route Recommendation"]
)
from database.schemas import RouteRequest, TranslationRequest
from auth.jwt_handler import get_current_user
from database.models import Profile
from database.mongo import route_searches, recommendations
from datetime import datetime, timezone
from services.health_service import health_advice
from services.sarvam_service import translate_text
from services.localization_service import localize_recommendation

@router.post("/recommend")
def recommend(
    request: RouteRequest,
    db: Session = Depends(get_db),
    current_user: Profile = Depends(get_current_user)
):
    conditions = [item.condition.condition_name for item in current_user.health_conditions]
    try:
        result = recommend_route(
            db=db,
            source=request.source,
            destination=request.destination,
            profile_id=current_user.profile_id,
            start_time=request.start_time,
            age=current_user.age,
            health_conditions=conditions,
        )
    except Exception as exc:
        raise HTTPException(status_code=502, detail=f"Route/AQI provider failed: {exc}") from exc

    advice = health_advice(result["recommended_route"]["route_aqi_score"], conditions, current_user.age)
    language = current_user.language.language_name
    try:
        localized_advice = translate_text(advice, language)
    except (RuntimeError, ValueError):
        # A recommendation remains useful when the optional translation provider is unavailable.
        localized_advice = advice
    result["health_recommendation"] = {
        "profile_health_conditions": conditions,
        "preferred_language": language,
        "age": current_user.age,
        "age_sensitive": current_user.age <= 12 or current_user.age >= 60,
        "advice": localized_advice,
    }
    try:
        result["localized_display"] = localize_recommendation(
            result, language, conditions, localized_advice
        )
    except (RuntimeError, ValueError):
        # Keep the core route response usable if Sarvam is temporarily unavailable.
        result["localized_display"] = {"language": language, "health_advice": localized_advice}
    created_at = datetime.now(timezone.utc)
    search_id = route_searches.insert_one({"profile_id": current_user.profile_id, "source": request.source, "destination": request.destination, "start_time": request.start_time, "all_routes": result["all_routes"], "created_at": created_at}).inserted_id
    recommendation_id = recommendations.insert_one({
        **result,
        "search_id": str(search_id),
        # OpenWeather supplies pollutant concentrations, not a CPCB station AQI.
        "openweather_pm_derived_aqi_estimate": result["recommended_route"]["average_live_aqi"],
        "route_aqi_score": result["recommended_route"]["route_aqi_score"],
        "health_risk_score": result["recommended_route"]["health_risk_score"],
        "model_predicted_aqi": result["recommended_route"]["average_model_predicted_aqi"],
        "created_at": created_at,
    }).inserted_id
    result["search_id"] = str(search_id)
    result["recommendation_id"] = str(recommendation_id)
    return result

@router.get("/history")
def route_history(current_user: Profile = Depends(get_current_user)):
    return [{**record, "_id": str(record["_id"])} for record in route_searches.find({"profile_id": current_user.profile_id}).sort("created_at", -1).limit(50)]


@router.post("/translate")
def translate_for_user(request: TranslationRequest, current_user: Profile = Depends(get_current_user)):
    """Translate arbitrary UI text into the authenticated user's preferred language."""
    if request.target_language != current_user.language.language_name:
        raise HTTPException(status_code=403, detail="Target language must match the profile preference")
    try:
        return {"translated_text": translate_text(request.text, request.target_language)}
    except (RuntimeError, ValueError) as exc:
        raise HTTPException(status_code=503, detail=str(exc)) from exc
