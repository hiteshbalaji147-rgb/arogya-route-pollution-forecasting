from sqlalchemy import Column, Integer, String, Boolean, DateTime, ForeignKey, UniqueConstraint
from sqlalchemy.sql import func
from sqlalchemy.orm import relationship
from datetime import datetime
from .postgres import Base
from sqlalchemy import Float

class Language(Base):
    __tablename__ = "language"

    language_id = Column(Integer, primary_key=True, index=True)
    language_name = Column(String, unique=True, nullable=False)

    profiles = relationship("Profile", back_populates="language")


class HealthCondition(Base):
    __tablename__ = "health_condition"

    condition_id = Column(Integer, primary_key=True, index=True)
    condition_name = Column(String, unique=True, nullable=False)

    profile_health = relationship("ProfileHealth", back_populates="condition")


class Profile(Base):
    __tablename__ = "profile"

    profile_id = Column(Integer, primary_key=True, index=True)

    username = Column(String, nullable=False)

    email = Column(String, unique=True, nullable=False)

    password_hash = Column(String, nullable=False)

    age = Column(Integer, nullable=False)

    language_id = Column(Integer, ForeignKey("language.language_id"))

    has_health_condition = Column(Boolean, nullable=False)

    profile_completed = Column(Boolean, default=False)

    created_at = Column(DateTime(timezone=True), server_default=func.now())

    language = relationship("Language", back_populates="profiles")

    health_conditions = relationship("ProfileHealth", back_populates="profile")
    completion = relationship("ProfileCompletion", back_populates="profile", uselist=False)


class ProfileHealth(Base):
    __tablename__ = "profile_health"
    __table_args__ = (UniqueConstraint("profile_id", "condition_id", name="uq_profile_condition"),)

    id = Column(Integer, primary_key=True, index=True)

    profile_id = Column(Integer, ForeignKey("profile.profile_id"))

    condition_id = Column(Integer, ForeignKey("health_condition.condition_id"))

    profile = relationship("Profile", back_populates="health_conditions")

    condition = relationship("HealthCondition", back_populates="profile_health")


class ProfileCompletion(Base):
    """Auditable yes/no answers showing registration was completed."""
    __tablename__ = "profile_completion"

    profile_id = Column(Integer, ForeignKey("profile.profile_id"), primary_key=True)
    username_answered = Column(Boolean, nullable=False, default=True)
    email_answered = Column(Boolean, nullable=False, default=True)
    password_answered = Column(Boolean, nullable=False, default=True)
    age_answered = Column(Boolean, nullable=False, default=True)
    language_answered = Column(Boolean, nullable=False, default=True)
    health_question_answered = Column(Boolean, nullable=False, default=True)
    all_questions_answered = Column(Boolean, nullable=False, default=True)
    completed_at = Column(DateTime(timezone=True), server_default=func.now())

    profile = relationship("Profile", back_populates="completion")

class RefreshToken(Base):
    __tablename__ = "refresh_token"
    token_id = Column(Integer, primary_key=True, index=True)
    profile_id = Column(Integer, ForeignKey("profile.profile_id"), nullable=False, index=True)
    token_hash = Column(String(64), unique=True, nullable=False, index=True)
    expires_at = Column(DateTime(timezone=True), nullable=False)
    revoked = Column(Boolean, nullable=False, default=False)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    profile = relationship("Profile")

class AQIHistory(Base):
    __tablename__ = "aqi_history"

    id = Column(Integer, primary_key=True, index=True)

    city = Column(String, nullable=False)

    latitude = Column(Float, nullable=False)

    longitude = Column(Float, nullable=False)

    predicted_aqi = Column(Float, nullable=False)

    prediction_time = Column(
        DateTime,
        default=datetime.utcnow
    )
