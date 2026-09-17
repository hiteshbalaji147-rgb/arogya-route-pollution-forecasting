from datetime import datetime, timedelta, timezone
from jose import jwt, JWTError
from typing import Optional

from config import (
    SECRET_KEY,
    ALGORITHM,
    ACCESS_TOKEN_EXPIRE_MINUTES,
    REFRESH_TOKEN_EXPIRE_DAYS
)

from fastapi import Depends, HTTPException
from fastapi.security import OAuth2PasswordBearer
from sqlalchemy.orm import Session

from database.postgres import get_db
from database.crud import get_user_by_email
from database.models import Profile

oauth2_scheme = OAuth2PasswordBearer(tokenUrl="/auth/login", auto_error=False)


def create_access_token(data: dict):
    to_encode = data.copy()
    expire = datetime.now(timezone.utc) + timedelta(minutes=ACCESS_TOKEN_EXPIRE_MINUTES)
    to_encode.update({"exp": expire, "type": "access"})
    return jwt.encode(to_encode, SECRET_KEY, algorithm=ALGORITHM)


def create_refresh_token(data: dict):
    to_encode = data.copy()
    expire = datetime.now(timezone.utc) + timedelta(days=REFRESH_TOKEN_EXPIRE_DAYS)
    to_encode.update({"exp": expire, "type": "refresh"})
    return jwt.encode(to_encode, SECRET_KEY, algorithm=ALGORITHM)


def verify_token(token: str):
    try:
        return jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM])
    except JWTError:
        return None


def get_current_user(token: Optional[str] = Depends(oauth2_scheme), db: Session = Depends(get_db)):
    if not token:
        raise HTTPException(status_code=401, detail="Not authenticated")
    payload = verify_token(token)
    if payload is None:
        raise HTTPException(status_code=401, detail="Invalid token")
    if payload.get("type") != "access":
        raise HTTPException(status_code=401, detail="Access token required")
    email = payload.get("sub")
    user = get_user_by_email(db, email)
    if user is None:
        raise HTTPException(status_code=401, detail="User not found")
    return user


def get_optional_current_user(token: Optional[str] = Depends(oauth2_scheme), db: Session = Depends(get_db)) -> Optional[Profile]:
    if not token:
        return None
    payload = verify_token(token)
    if payload is None or payload.get("type") != "access":
        return None
    email = payload.get("sub")
    return get_user_by_email(db, email)


def verify_refresh_token(token: str):
    payload = verify_token(token)
    if payload is None or payload.get("type") != "refresh":
        return None
    return payload


def get_current_admin(token: Optional[str] = Depends(oauth2_scheme), db: Session = Depends(get_db)):
    from database.models import AdminUser
    if not token:
        raise HTTPException(status_code=401, detail="Admin authentication required")
    payload = verify_token(token)
    if payload is None or payload.get("type") != "access":
        raise HTTPException(status_code=401, detail="Invalid admin token")
    
    email = payload.get("sub")
    role = payload.get("role", "")
    if role not in ["admin", "ADMIN", "SUPER_ADMIN"]:
        # Check if user is registered in AdminUser table
        admin = db.query(AdminUser).filter(AdminUser.email == email, AdminUser.is_active == True).first()
        if not admin:
            raise HTTPException(status_code=403, detail="Admin privileges required")
        return admin
    
    admin = db.query(AdminUser).filter(AdminUser.email == email, AdminUser.is_active == True).first()
    if not admin:
        raise HTTPException(status_code=401, detail="Admin account not found or deactivated")
    return admin


