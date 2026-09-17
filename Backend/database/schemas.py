from datetime import datetime
from pydantic import BaseModel, EmailStr, Field, model_validator
from typing import List


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
