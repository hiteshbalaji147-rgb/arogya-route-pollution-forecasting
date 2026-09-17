from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from sqlalchemy.exc import IntegrityError

from database.postgres import get_db
from database.schemas import ProfileRegister, ProfileResponse
from database.crud import get_user_by_email, create_user

from auth.jwt_handler import (
    create_access_token,
    create_refresh_token,
    get_current_user,
    verify_refresh_token
)
from auth.security import hash_refresh_token
from database.models import RefreshToken
from config import REFRESH_TOKEN_EXPIRE_DAYS
from datetime import datetime, timedelta, timezone

router = APIRouter(
    prefix="/auth",
    tags=["Authentication"]
)

@router.get("/languages")
def list_languages(db: Session = Depends(get_db)):
    from database.models import Language
    return [{"language_id": item.language_id, "language_name": item.language_name} for item in db.query(Language).order_by(Language.language_name).all()]

@router.get("/health-conditions")
def list_health_conditions(db: Session = Depends(get_db)):
    from database.models import HealthCondition
    return [{"condition_id": item.condition_id, "condition_name": item.condition_name} for item in db.query(HealthCondition).order_by(HealthCondition.condition_name).all()]


@router.post(
    "/register",
    response_model=ProfileResponse
)
def register(
    user: ProfileRegister,
    db: Session = Depends(get_db)
):

    existing_user = get_user_by_email(
        db,
        user.email
    )

    if existing_user:
        raise HTTPException(
            status_code=409,
            detail="User already exists"
        )

    try:
        return create_user(db, user)
    except IntegrityError:
        db.rollback()
        # The database unique constraint is the final guard against concurrent requests.
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

    user = authenticate_user(
        db,
        login_data.email,
        login_data.password
    )

    if not user:

        raise HTTPException(
            status_code=401,
            detail="Invalid email or password"
        )

    access_token = create_access_token(
        {
            "sub": user.email
        }
    )

    refresh_token = create_refresh_token(
        {
            "sub": user.email
        }
    )

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

from auth.jwt_handler import get_current_user
from database.models import Profile

@router.get("/me")
def get_profile(
    current_user: Profile = Depends(get_current_user)
):

    return {
        "profile_id": current_user.profile_id,
        "username": current_user.username,
        "email": current_user.email,
        "age": current_user.age,
        "language": current_user.language.language_name,
        "has_health_condition": current_user.has_health_condition,
        "health_conditions": [item.condition.condition_name for item in current_user.health_conditions],
        "all_questions_answered": current_user.completion.all_questions_answered if current_user.completion else False,
    }

from database.schemas import RefreshTokenRequest
from database.schemas import RefreshTokenResponse
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
        raise HTTPException(
            status_code=401,
            detail="Invalid refresh token"
        )

    stored_token = db.query(RefreshToken).filter(
        RefreshToken.token_hash == hash_refresh_token(request.refresh_token),
        RefreshToken.revoked.is_(False)
    ).first()
    if not stored_token or stored_token.expires_at.replace(tzinfo=timezone.utc) < datetime.now(timezone.utc):
        raise HTTPException(status_code=401, detail="Refresh token expired or revoked")

    stored_token.revoked = True
    access_token = create_access_token(
        {
            "sub": payload["sub"]
        }
    )
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

@router.post("/logout", status_code=204)
def logout(request: RefreshTokenRequest, db: Session = Depends(get_db)):
    stored_token = db.query(RefreshToken).filter(RefreshToken.token_hash == hash_refresh_token(request.refresh_token)).first()
    if stored_token:
        stored_token.revoked = True
        db.commit()
