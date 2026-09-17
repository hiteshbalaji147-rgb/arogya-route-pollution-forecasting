from datetime import datetime
from pydantic import BaseModel, EmailStr, Field, model_validator
from typing import List, Optional


class ProfileRegister(BaseModel):
    username: str
    email: EmailStr
    password: str
    age: int = Field(ge=1, le=120, description="Age in completed years")
    language_id: int
    has_health_condition: bool
    condition_ids: List[int] = Field(default_factory=list)

    @model_validator(mode="after")
    def validate_health_answers(self):
        if self.has_health_condition != bool(self.condition_ids):
            raise ValueError("condition_ids must be provided only when has_health_condition is true")
        return self


class ProfileResponse(BaseModel):
    profile_id: int
    username: str
    email: EmailStr

    class Config:
        from_attributes = True

class LoginRequest(BaseModel):
    email: EmailStr
    password: str


class Token(BaseModel):
    access_token: str
    refresh_token: str
    token_type: str


class TokenData(BaseModel):
    email: str | None = None

class RefreshTokenRequest(BaseModel):
    refresh_token: str

class RefreshTokenResponse(BaseModel):
    access_token: str
    refresh_token: str
    token_type: str


class TranslationRequest(BaseModel):
    text: str = Field(min_length=1, max_length=2000)
    target_language: str

class RouteRequest(BaseModel):
    source: str = Field(min_length=2)
    destination: str = Field(min_length=2)
    start_time: datetime
    language: Optional[str] = Field(default=None, description="Preferred language code or name, e.g. hi-IN or Hindi")


class WebsiteContentResponse(BaseModel):
    language: str
    content: dict[str, str]
    cached: bool


class LanguageUpdateRequest(BaseModel):
    language_id: int

class AddLanguageRequest(BaseModel):
    language_name: str = Field(min_length=2, max_length=50)
    code: Optional[str] = Field(default=None, max_length=20)

class SettingsUpdateRequest(BaseModel):
    username: Optional[str] = None
    language: Optional[str] = None
    health_conditions: Optional[List[str]] = Field(default_factory=list)


# ── Feedback Schemas ─────────────────────────────────────────────────────────

class FeedbackCreate(BaseModel):
    rating: int = Field(ge=1, le=5, description="Star rating from 1 to 5")
    feedback_text: str = Field(min_length=1, max_length=2000)
    page_url: Optional[str] = Field(default=None, max_length=255)
    email: Optional[EmailStr] = None


class FeedbackResponse(BaseModel):
    id: int
    rating: int
    feedback_text: str
    page_url: Optional[str]
    feedback_email: Optional[EmailStr] = None
    created_at: datetime

    class Config:
        from_attributes = True


class TimeWindowStats(BaseModel):
    last_24h: int
    last_7d: int
    last_30d: int
    all_time: int


class DailyPoint(BaseModel):
    date: str   # ISO date string e.g. "2026-08-01"
    journeys: int
    feedback: int


class AdminStatsResponse(BaseModel):
    new_accounts: TimeWindowStats
    active_users: TimeWindowStats
    journeys_planned: TimeWindowStats
    feedback: TimeWindowStats
    never_planned: int          # accounts that exist but have 0 journeys
    total_accounts: int
    daily_last_30: List[DailyPoint]


# ── Google OAuth & Geolocation Schemas ───────────────────────────────────────

class GoogleAuthRequest(BaseModel):
    credential: str = Field(min_length=10, description="Google ID token from GSI")


class GeolocationUpdate(BaseModel):
    latitude: float = Field(ge=-90, le=90)
    longitude: float = Field(ge=-180, le=180)
    city: Optional[str] = Field(default=None, max_length=100)
    country: Optional[str] = Field(default=None, max_length=100)


class UserLocationResponse(BaseModel):
    latitude: float
    longitude: float
    city: Optional[str]
    country: Optional[str]
    updated_at: Optional[datetime]

    class Config:
        from_attributes = True
