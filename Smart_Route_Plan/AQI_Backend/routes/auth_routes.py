from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from sqlalchemy.exc import IntegrityError

from database.postgres import get_db
from database.schemas import ProfileRegister, ProfileResponse, LanguageUpdateRequest, SettingsUpdateRequest
from database.crud import get_user_by_email, create_user

from auth.jwt_handler import (
    create_access_token,
    create_refresh_token,
    get_current_user,
    verify_refresh_token
)
from auth.security import hash_refresh_token
from database.models import RefreshToken, Profile, Language, HealthCondition, ProfileHealth, ProfileCompletion
from config import REFRESH_TOKEN_EXPIRE_DAYS
from datetime import datetime, timedelta, timezone

router = APIRouter(
    prefix="/auth",
    tags=["Authentication"]
)

@router.get("/languages")
def list_languages(db: Session = Depends(get_db)):
    return [{"language_id": item.language_id, "language_name": item.language_name} for item in db.query(Language).order_by(Language.language_name).all()]

@router.get("/health-conditions")
def list_health_conditions(db: Session = Depends(get_db)):
    return [{"condition_id": item.condition_id, "condition_name": item.condition_name} for item in db.query(HealthCondition).order_by(HealthCondition.condition_name).all()]


@router.post(
    "/register",
    response_model=ProfileResponse
)
def register(
    user: ProfileRegister,
    db: Session = Depends(get_db)
):
    existing_user = get_user_by_email(db, user.email)
    if existing_user:
        raise HTTPException(status_code=409, detail="User already exists")

    try:
        return create_user(db, user)
    except IntegrityError:
        db.rollback()
        raise HTTPException(status_code=409, detail="User already exists")
    except ValueError as exc:
        raise HTTPException(status_code=422, detail=str(exc)) from exc

from database.schemas import LoginRequest, Token
from database.crud import authenticate_user

@router.post(
    "/login",
    response_model=Token
)
def login(
    login_data: LoginRequest,
    db: Session = Depends(get_db)
):
    user = authenticate_user(db, login_data.email, login_data.password)

    if not user:
        raise HTTPException(status_code=401, detail="Invalid email or password")

    access_token = create_access_token({"sub": user.email})
    refresh_token = create_refresh_token({"sub": user.email})

    db.add(RefreshToken(
        profile_id=user.profile_id,
        token_hash=hash_refresh_token(refresh_token),
        expires_at=datetime.now(timezone.utc) + timedelta(days=REFRESH_TOKEN_EXPIRE_DAYS)
    ))
    db.commit()

    return {
        "access_token": access_token,
        "refresh_token": refresh_token,
        "token_type": "bearer"
    }


@router.get("/me")
def get_profile(
    current_user: Profile = Depends(get_current_user)
):
    return {
        "profile_id": current_user.profile_id,
        "username": current_user.username,
        "email": current_user.email,
        "age": current_user.age,
        "language": current_user.language.language_name if current_user.language else "English",
        "has_health_condition": current_user.has_health_condition,
        "health_conditions": [item.condition.condition_name for item in current_user.health_conditions],
        "all_questions_answered": current_user.completion.all_questions_answered if current_user.completion else False,
        "avatar_url": current_user.avatar_url or "",
        "is_google": bool(current_user.google_id),
        "last_location": {
            "city": current_user.location.city if current_user.location else None,
            "country": current_user.location.country if current_user.location else None,
            "latitude": current_user.location.latitude if current_user.location else None,
            "longitude": current_user.location.longitude if current_user.location else None,
        } if current_user.location else None,
    }


@router.put("/me")
def update_profile(
    settings: SettingsUpdateRequest,
    db: Session = Depends(get_db),
    current_user: Profile = Depends(get_current_user),
):
    """Save updated profile settings (username, language, health conditions) to PostgreSQL."""
    if settings.username:
        current_user.username = settings.username

    if settings.language:
        lang_obj = db.query(Language).filter(Language.language_name == settings.language).first()
        if not lang_obj:
            # Map code or fallback
            lang_obj = db.query(Language).filter(Language.language_name == "English").first()
        if lang_obj:
            current_user.language_id = lang_obj.language_id

    if settings.health_conditions is not None:
        # Clear existing conditions
        db.query(ProfileHealth).filter(ProfileHealth.profile_id == current_user.profile_id).delete()
        current_user.has_health_condition = len(settings.health_conditions) > 0

        for cond_name in settings.health_conditions:
            hc = db.query(HealthCondition).filter(HealthCondition.condition_name == cond_name).first()
            if not hc:
                hc = HealthCondition(condition_name=cond_name)
                db.add(hc)
                db.flush()
            db.add(ProfileHealth(profile_id=current_user.profile_id, condition_id=hc.condition_id))

    db.commit()
    db.refresh(current_user)

    return {
        "message": "Settings updated successfully",
        "username": current_user.username,
        "email": current_user.email,
        "language": current_user.language.language_name if current_user.language else "English",
        "health_conditions": [item.condition.condition_name for item in current_user.health_conditions],
    }


from database.schemas import RefreshTokenRequest, RefreshTokenResponse

@router.post(
    "/refresh",
    response_model=RefreshTokenResponse
)
def refresh_token(
    request: RefreshTokenRequest,
    db: Session = Depends(get_db)
):
    payload = verify_refresh_token(request.refresh_token)
    if payload is None:
        raise HTTPException(status_code=401, detail="Invalid refresh token")

    stored_token = db.query(RefreshToken).filter(
        RefreshToken.token_hash == hash_refresh_token(request.refresh_token),
        RefreshToken.revoked.is_(False)
    ).first()
    if not stored_token or stored_token.expires_at.replace(tzinfo=timezone.utc) < datetime.now(timezone.utc):
        raise HTTPException(status_code=401, detail="Refresh token expired or revoked")

    stored_token.revoked = True
    access_token = create_access_token({"sub": payload["sub"]})
    new_refresh_token = create_refresh_token({"sub": payload["sub"]})

    db.add(RefreshToken(
        profile_id=stored_token.profile_id,
        token_hash=hash_refresh_token(new_refresh_token),
        expires_at=datetime.now(timezone.utc) + timedelta(days=REFRESH_TOKEN_EXPIRE_DAYS)
    ))
    db.commit()

    return {
        "access_token": access_token,
        "refresh_token": new_refresh_token,
        "token_type": "bearer"
    }


@router.patch("/me/language")
def update_language(
    request: LanguageUpdateRequest,
    db: Session = Depends(get_db),
    current_user: Profile = Depends(get_current_user),
):
    language = db.query(Language).filter(Language.language_id == request.language_id).first()
    if not language:
        raise HTTPException(status_code=404, detail="Language not found")
    current_user.language_id = language.language_id
    db.commit()
    return {"language_id": language.language_id, "language": language.language_name}


@router.post("/logout", status_code=204)
def logout(request: RefreshTokenRequest, db: Session = Depends(get_db)):
    stored_token = db.query(RefreshToken).filter(RefreshToken.token_hash == hash_refresh_token(request.refresh_token)).first()
    if stored_token:
        stored_token.revoked = True
        db.commit()


# ── Google OAuth ──────────────────────────────────────────────────────────────

from database.schemas import GoogleAuthRequest, GeolocationUpdate, UserLocationResponse
from database.models import UserLocation
from datetime import datetime, timezone as tz
import os

def _verify_google_token(credential: str) -> dict:
    """Verify a Google ID token and return its payload. Returns None on failure."""
    import logging
    logger = logging.getLogger("arogya.google_auth")

    client_id = os.getenv("GOOGLE_CLIENT_ID", "").strip()
    if not client_id or "your_google_client_id" in client_id:
        logger.error("GOOGLE_CLIENT_ID is not configured in .env")
        return None

    try:
        from google.oauth2 import id_token
        from google.auth.transport import requests as g_requests

        logger.info(f"Verifying Google token for client_id={client_id[:20]}...")
        info = id_token.verify_oauth2_token(
            credential,
            g_requests.Request(),
            client_id,
        )
        logger.info(f"Google token valid: email={info.get('email')}")
        return info

    except ValueError as e:
        # Token verification failed (wrong audience, expired, tampered, etc.)
        logger.error(f"Google token ValueError: {e}")
        return None
    except Exception as e:
        logger.error(f"Google token unexpected error: {type(e).__name__}: {e}")
        return None


@router.post("/google")
def google_auth(request: GoogleAuthRequest, db: Session = Depends(get_db)):
    """Verify a Google ID token and issue our own JWT access/refresh tokens.
    Creates a Profile automatically on first sign-in."""
    import logging
    logger = logging.getLogger("arogya.google_auth")

    payload = _verify_google_token(request.credential)
    if payload is None:
        client_id = os.getenv("GOOGLE_CLIENT_ID", "").strip()
        if not client_id or "your_google_client_id" in client_id:
            detail = "Google Sign-In is not configured on the server. Please set GOOGLE_CLIENT_ID in .env"
        else:
            detail = (
                "Google credential verification failed. "
                "Possible causes: (1) Your OAuth Consent Screen may be in 'Testing' mode — "
                "add your Gmail as a test user at console.cloud.google.com, or publish the app. "
                "(2) Token may have expired — try again."
            )
        raise HTTPException(status_code=401, detail=detail)

    email = payload.get("email")
    if not email:
        raise HTTPException(status_code=400, detail="Google token missing email claim")

    google_id = payload.get("sub", "")
    full_name = payload.get("name", email.split("@")[0])
    avatar_url = payload.get("picture", "")

    # Find existing profile by email or google_id
    user = db.query(Profile).filter(
        (Profile.email == email) | (Profile.google_id == google_id)
    ).first()

    if user is None:
        # Auto-create profile for first-time Google sign-in
        # Default language: English (id=1)
        lang = db.query(Language).filter(Language.language_name == "English").first()
        lang_id = lang.language_id if lang else 1
        user = Profile(
            username=full_name,
            email=email,
            password_hash="GOOGLE_OAUTH_NO_PASSWORD",
            age=25,
            language_id=lang_id,
            has_health_condition=False,
            profile_completed=True,
            google_id=google_id,
            avatar_url=avatar_url,
            last_login=datetime.now(tz.utc),
        )
        db.add(user)
        db.commit()
        db.refresh(user)
        db.add(ProfileCompletion(profile_id=user.profile_id))
        db.commit()
    else:
        # Update OAuth fields on returning users
        user.google_id = google_id
        user.avatar_url = avatar_url or user.avatar_url
        user.last_login = datetime.now(tz.utc)
        db.commit()

    # Issue our JWT tokens
    access_token = create_access_token({"sub": user.email})
    refresh_token_val = create_refresh_token({"sub": user.email})
    db.add(RefreshToken(
        profile_id=user.profile_id,
        token_hash=hash_refresh_token(refresh_token_val),
        expires_at=datetime.now(tz.utc) + timedelta(days=REFRESH_TOKEN_EXPIRE_DAYS),
    ))
    db.commit()

    return {
        "access_token": access_token,
        "refresh_token": refresh_token_val,
        "token_type": "bearer",
    }


# ── Geolocation ───────────────────────────────────────────────────────────────

@router.post("/me/location", response_model=UserLocationResponse, status_code=201)
def save_location(
    geo: GeolocationUpdate,
    db: Session = Depends(get_db),
    current_user: Profile = Depends(get_current_user),
):
    """Upsert the logged-in user's GPS coordinates."""
    existing = db.query(UserLocation).filter(
        UserLocation.profile_id == current_user.profile_id
    ).first()

    if existing:
        existing.latitude = geo.latitude
        existing.longitude = geo.longitude
        existing.city = geo.city or existing.city
        existing.country = geo.country or existing.country
        existing.updated_at = datetime.now(tz.utc)
    else:
        existing = UserLocation(
            profile_id=current_user.profile_id,
            latitude=geo.latitude,
            longitude=geo.longitude,
            city=geo.city,
            country=geo.country,
        )
        db.add(existing)

    db.commit()
    db.refresh(existing)
    return existing


@router.get("/me/location", response_model=UserLocationResponse)
def get_location(
    db: Session = Depends(get_db),
    current_user: Profile = Depends(get_current_user),
):
    """Return the user's last known GPS location."""
    loc = db.query(UserLocation).filter(
        UserLocation.profile_id == current_user.profile_id
    ).first()
    if not loc:
        raise HTTPException(status_code=404, detail="No location saved yet")
    return loc

