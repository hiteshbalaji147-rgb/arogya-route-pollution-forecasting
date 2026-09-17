from sqlalchemy import Column, Integer, String, Boolean, DateTime, ForeignKey, UniqueConstraint, Text, Float, Index, CheckConstraint
from sqlalchemy.sql import func
from sqlalchemy.orm import relationship
from datetime import datetime
from .postgres import Base

class Language(Base):
    __tablename__ = "language"

    language_id = Column(Integer, primary_key=True, index=True)
    language_name = Column(String, unique=True, nullable=False)
    # Stable IETF-style code used by the UI and translation provider.
    language_code = Column(String(20), unique=True, nullable=True, index=True)

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
    location = relationship("UserLocation", back_populates="profile", uselist=False)

    # OAuth & session extras (nullable — fully backward-compatible)
    google_id = Column(String(255), unique=True, nullable=True, index=True)
    avatar_url = Column(Text, nullable=True)
    last_login = Column(DateTime(timezone=True), nullable=True)


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


class Translation(Base):
    """PostgreSQL table for static and dynamic UI text translations with caching."""
    __tablename__ = "translations"
    __table_args__ = (
        UniqueConstraint("translation_key", "language_code", name="unique_key_lang"),
        Index("idx_translations_key_lang", "translation_key", "language_code"),
    )

    id = Column(Integer, primary_key=True, index=True)
    translation_key = Column(String(255), nullable=False, index=True)
    language_code = Column(String(10), nullable=False, index=True)
    source_text = Column(Text, nullable=False)
    translated_text = Column(Text, nullable=False)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now())


class UserWebsiteContent(Base):
    """PostgreSQL table storing static content/copy for the User Portal by language."""
    __tablename__ = "user_website_content"
    __table_args__ = (UniqueConstraint("content_key", "language_name", name="uq_user_website_content_key_lang"),)

    content_id = Column(Integer, primary_key=True, index=True)
    content_key = Column(String(120), nullable=False, index=True)
    language_name = Column(String(50), nullable=False, index=True)
    content_value = Column(Text, nullable=False)
    source_content = Column(Text, nullable=False)
    is_machine_translated = Column(Boolean, nullable=False, default=False)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now())


class AdminWebsiteContent(Base):
    """PostgreSQL table storing static content/copy for the Admin Portal by language."""
    __tablename__ = "admin_website_content"
    __table_args__ = (UniqueConstraint("content_key", "language_name", name="uq_admin_website_content_key_lang"),)

    content_id = Column(Integer, primary_key=True, index=True)
    content_key = Column(String(120), nullable=False, index=True)
    language_name = Column(String(50), nullable=False, index=True)
    content_value = Column(Text, nullable=False)
    source_content = Column(Text, nullable=False)
    is_machine_translated = Column(Boolean, nullable=False, default=False)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now())



class AQIHistory(Base):
    __tablename__ = "aqi_history"

    id = Column(Integer, primary_key=True, index=True)
    city = Column(String, nullable=False)
    latitude = Column(Float, nullable=False)
    longitude = Column(Float, nullable=False)
    predicted_aqi = Column(Float, nullable=False)
    prediction_time = Column(DateTime, default=datetime.utcnow)


class JourneyHistoryRecord(Base):
    """PostgreSQL table to guarantee 100% reliable journey history persistence."""
    __tablename__ = "journey_history_records"

    id = Column(Integer, primary_key=True, index=True)
    profile_id = Column(Integer, nullable=False, index=True, default=0)
    source = Column(String(255), nullable=False)
    destination = Column(String(255), nullable=False)
    route_count = Column(Integer, nullable=False, default=2)
    avg_aqi = Column(Float, nullable=False, default=50.0)
    created_at = Column(DateTime(timezone=True), server_default=func.now())


class UserFeedback(Base):
    """Stores user-submitted feedback with star rating and text."""
    __tablename__ = "user_feedback"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(String(255), nullable=True, index=True)  # NULL for guest/visitor
    feedback_email = Column(String(255), nullable=True, index=True)
    rating = Column(Integer, nullable=False)
    feedback_text = Column(Text, nullable=False)
    page_url = Column(String(255), nullable=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now())

    __table_args__ = (
        CheckConstraint("rating >= 1 AND rating <= 5", name="ck_rating_range"),
    )


class JourneysPlanned(Base):
    """Analytics mirror table for admin dashboard — tracks every journey planned."""
    __tablename__ = "journeys_planned"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(String(255), nullable=True, index=True)
    origin = Column(Text, nullable=False)
    destination = Column(Text, nullable=False)
    avg_aqi = Column(Integer, nullable=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now())


class UserLocation(Base):
    """Stores the most-recent GPS fix for a profile (upserted on every login/update)."""
    __tablename__ = "user_location"

    id = Column(Integer, primary_key=True, index=True)
    profile_id = Column(Integer, ForeignKey("profile.profile_id"), nullable=False, unique=True, index=True)
    latitude = Column(Float, nullable=False)
    longitude = Column(Float, nullable=False)
    city = Column(String(100), nullable=True)
    country = Column(String(100), nullable=True)
    updated_at = Column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now())

    profile = relationship("Profile", back_populates="location")


class AdminUser(Base):
    """Database model for registered admin users."""
    __tablename__ = "admin_users"

    admin_id = Column(Integer, primary_key=True, index=True)
    username = Column(String(100), nullable=False)
    email = Column(String(255), unique=True, nullable=False, index=True)
    password_hash = Column(String(255), nullable=False)
    role = Column(String(50), nullable=False, default="SUPER_ADMIN")
    is_active = Column(Boolean, nullable=False, default=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    last_login = Column(DateTime(timezone=True), nullable=True)


class AdminInvitation(Base):
    """Database table to track role-based admin portal invitations sent via SMTP."""
    __tablename__ = "admin_invitations"

    id = Column(Integer, primary_key=True, index=True)
    email = Column(String(255), nullable=False, index=True)
    role = Column(String(50), nullable=False, default="ADMIN")
    token = Column(String(255), unique=True, nullable=False, index=True)
    status = Column(String(50), nullable=False, default="PENDING")  # PENDING, ACCEPTED, EXPIRED, REVOKED
    invited_by_admin_id = Column(Integer, ForeignKey("admin_users.admin_id"), nullable=True)
    invited_by_email = Column(String(255), nullable=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    accepted_at = Column(DateTime(timezone=True), nullable=True)
    expires_at = Column(DateTime(timezone=True), nullable=True)

