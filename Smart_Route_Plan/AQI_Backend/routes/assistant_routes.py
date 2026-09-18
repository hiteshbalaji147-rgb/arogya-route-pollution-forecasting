from typing import Optional

from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel, Field
from sqlalchemy.orm import Session

from ai.chatbot import answer_question
from auth.jwt_handler import get_current_user
from database.models import Profile
from database.postgres import get_db
from services.website_content_service import get_or_create_cached_translation


class AssistantRequest(BaseModel):
    question: str = Field(min_length=2, max_length=1200)
    latitude: Optional[float] = None
    longitude: Optional[float] = None
    source: Optional[str] = Field(default=None, max_length=300)
    destination: Optional[str] = Field(default=None, max_length=300)
    language: str = Field(default="en-IN", max_length=20)


router = APIRouter(prefix="/assistant", tags=["AI Pollution Assistant"])


@router.post("/chat")
def chat(request: AssistantRequest, db: Session = Depends(get_db), current_user: Profile = Depends(get_current_user)):
    try:
        language = request.language or getattr(current_user.language, "language_name", "English")
        result = answer_question(db, current_user, request.question, request.latitude, request.longitude, request.source, request.destination, language)
        result["answer"] = get_or_create_cached_translation(db, result["answer"], language)
        return result
    except Exception as exc:
        raise HTTPException(status_code=503, detail=f"Environmental assistant unavailable: {exc}") from exc