from typing import Optional
from fastapi import APIRouter, Depends, Query
from sqlalchemy import or_
from sqlalchemy.orm import Session

from auth.jwt_handler import get_optional_current_user
from database.models import Profile, Language
from database.postgres import get_db
from database.schemas import WebsiteContentResponse
from services.website_content_service import (
    get_user_website_content,
    get_admin_website_content
)

router = APIRouter(prefix="/content", tags=["Website Content"])


@router.get("/user", response_model=WebsiteContentResponse)
@router.get("/static", response_model=WebsiteContentResponse)
def user_static_content(
    lang: Optional[str] = Query(None, description="Target language name or code, e.g., 'hi-IN' or 'Hindi'"),
    db: Session = Depends(get_db),
    current_user: Optional[Profile] = Depends(get_optional_current_user),
):
    """Get User Portal static copy in requested language from user_website_content table in PostgreSQL."""
    if lang:
        language = db.query(Language).filter(
            or_(Language.language_name.ilike(lang), Language.language_code.ilike(lang))
        ).first()
        target_lang = language.language_name if language else lang
    elif current_user and current_user.language:
        target_lang = current_user.language.language_name
    else:
        target_lang = "English"

    content, cached = get_user_website_content(db, target_lang)
    return {"language": target_lang, "content": content, "cached": cached}


@router.get("/admin", response_model=WebsiteContentResponse)
def admin_static_content(
    lang: Optional[str] = Query(None, description="Target language name, e.g., 'Hindi', 'Tamil', 'Kannada'"),
    db: Session = Depends(get_db)
):
    """Get Admin Portal static copy in requested language from admin_website_content table in PostgreSQL."""
    language = db.query(Language).filter(
        or_(Language.language_name.ilike(lang), Language.language_code.ilike(lang))
    ).first() if lang else None
    target_lang = language.language_name if language else (lang or "English")
    content, cached = get_admin_website_content(db, target_lang)
    return {"language": target_lang, "content": content, "cached": cached}


@router.get("/languages")
def get_all_languages(db: Session = Depends(get_db)):
    """Fetch all platform languages registered in PostgreSQL."""
    langs = db.query(Language).all()
    return {
        "languages": [
            {
                "id": l.language_id,
                "name": l.language_name,
                "code": l.language_code or l.language_name.lower()[:2]
            }
            for l in langs
        ]
    }
