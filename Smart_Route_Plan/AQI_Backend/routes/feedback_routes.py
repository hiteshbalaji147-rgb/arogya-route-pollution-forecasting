"""
Feedback & Admin Analytics routes.

Public endpoint: POST /feedback/submit
Admin endpoint:  GET  /feedback/admin/stats  (requires X-Admin-Key header)
"""
from typing import Optional
from datetime import datetime, timezone, timedelta
from fastapi import APIRouter, Depends, HTTPException, Header
from sqlalchemy.orm import Session
from sqlalchemy import func, distinct, text

from database.postgres import get_db
from database.schemas import FeedbackCreate, FeedbackResponse, AdminStatsResponse, TimeWindowStats, DailyPoint
from database.models import UserFeedback, JourneysPlanned, Profile, JourneyHistoryRecord
from auth.jwt_handler import get_optional_current_user
import os

router = APIRouter(
    prefix="/feedback",
    tags=["Feedback & Admin"]
)

# Admin secret pulled from env — falls back to "admin123" for dev convenience
ADMIN_SECRET = os.getenv("ADMIN_SECRET_KEY", "admin123")


# ── Helpers ──────────────────────────────────────────────────────────────────

def _now() -> datetime:
    return datetime.now(timezone.utc)


def _cutoff(days: int) -> datetime:
    return _now() - timedelta(days=days)


def _window_stats(db: Session, model, ts_col, filter_col=None, distinct_col=None) -> TimeWindowStats:
    """Generic helper that counts rows (or distinct values) in each time window."""
    def _count(since: Optional[datetime]) -> int:
        q = db.query(func.count(distinct(distinct_col)) if distinct_col is not None else func.count(model.id))
        q = q.filter(model.__class__ == model.__class__)  # no-op anchor
        if since:
            q = q.filter(ts_col >= since)
        return q.scalar() or 0

    # Re-build query properly
    def cnt(since):
        col = func.count(distinct(distinct_col)) if distinct_col is not None else func.count(model.id)
        q = db.query(col)
        if since:
            q = q.filter(ts_col >= since)
        return q.scalar() or 0

    return TimeWindowStats(
        last_24h=cnt(_cutoff(1)),
        last_7d=cnt(_cutoff(7)),
        last_30d=cnt(_cutoff(30)),
        all_time=cnt(None),
    )


# ── Submit Feedback ───────────────────────────────────────────────────────────

@router.post("/submit", response_model=FeedbackResponse, status_code=201)
def submit_feedback(
    body: FeedbackCreate,
    db: Session = Depends(get_db),
    current_user: Optional[Profile] = Depends(get_optional_current_user),
):
    """Accept a star-rating + free-text feedback submission from any visitor."""
    user_id = str(current_user.profile_id) if current_user else None
    feedback_email = current_user.email if current_user else body.email

    record = UserFeedback(
        user_id=user_id,
        rating=body.rating,
        feedback_text=body.feedback_text,
        page_url=body.page_url,
        feedback_email=feedback_email,
    )
    db.add(record)
    db.commit()
    db.refresh(record)
    return record


# ── Admin Stats ───────────────────────────────────────────────────────────────

@router.get("/admin/stats", response_model=AdminStatsResponse)
def admin_stats(
    x_admin_key: str = Header(default=""),
    db: Session = Depends(get_db),
):
    """Return analytics counts for the admin dashboard.
    Requires the X-Admin-Key header to match ADMIN_SECRET_KEY env var."""
    if x_admin_key != ADMIN_SECRET:
        raise HTTPException(status_code=403, detail="Invalid or missing admin key")

    now = _now()
    cutoffs = {
        "last_24h": now - timedelta(hours=24),
        "last_7d":  now - timedelta(days=7),
        "last_30d": now - timedelta(days=30),
    }

    def profile_count(since=None):
        q = db.query(func.count(Profile.profile_id))
        if since:
            q = q.filter(Profile.created_at >= since)
        return q.scalar() or 0

    def active_users_count(since=None):
        """Distinct profile_ids that planned at least 1 journey in the window."""
        q = db.query(func.count(distinct(JourneyHistoryRecord.profile_id))).filter(
            JourneyHistoryRecord.profile_id != 0
        )
        if since:
            q = q.filter(JourneyHistoryRecord.created_at >= since)
        return q.scalar() or 0

    def journeys_count(since=None):
        q = db.query(func.count(JourneyHistoryRecord.id))
        if since:
            q = q.filter(JourneyHistoryRecord.created_at >= since)
        return q.scalar() or 0

    def feedback_count(since=None):
        q = db.query(func.count(UserFeedback.id))
        if since:
            q = q.filter(UserFeedback.created_at >= since)
        return q.scalar() or 0

    # New accounts stats
    new_accounts = TimeWindowStats(
        last_24h=profile_count(cutoffs["last_24h"]),
        last_7d=profile_count(cutoffs["last_7d"]),
        last_30d=profile_count(cutoffs["last_30d"]),
        all_time=profile_count(),
    )

    # Active users stats
    active_users = TimeWindowStats(
        last_24h=active_users_count(cutoffs["last_24h"]),
        last_7d=active_users_count(cutoffs["last_7d"]),
        last_30d=active_users_count(cutoffs["last_30d"]),
        all_time=active_users_count(),
    )

    # Journeys planned stats
    journeys_planned = TimeWindowStats(
        last_24h=journeys_count(cutoffs["last_24h"]),
        last_7d=journeys_count(cutoffs["last_7d"]),
        last_30d=journeys_count(cutoffs["last_30d"]),
        all_time=journeys_count(),
    )

    # Feedback stats
    feedback_stats = TimeWindowStats(
        last_24h=feedback_count(cutoffs["last_24h"]),
        last_7d=feedback_count(cutoffs["last_7d"]),
        last_30d=feedback_count(cutoffs["last_30d"]),
        all_time=feedback_count(),
    )

    # Accounts that never planned a journey
    total_accounts = profile_count()
    active_all = active_users_count()
    never_planned = max(0, total_accounts - active_all)

    # Daily breakdown for last 30 days sparkline chart
    daily_last_30: list[DailyPoint] = []
    for days_ago in range(29, -1, -1):
        day_start = (now - timedelta(days=days_ago)).replace(hour=0, minute=0, second=0, microsecond=0)
        day_end   = day_start + timedelta(days=1)

        j_count = db.query(func.count(JourneyHistoryRecord.id)).filter(
            JourneyHistoryRecord.created_at >= day_start,
            JourneyHistoryRecord.created_at < day_end,
        ).scalar() or 0

        f_count = db.query(func.count(UserFeedback.id)).filter(
            UserFeedback.created_at >= day_start,
            UserFeedback.created_at < day_end,
        ).scalar() or 0

        daily_last_30.append(DailyPoint(
            date=day_start.date().isoformat(),
            journeys=j_count,
            feedback=f_count,
        ))

    return AdminStatsResponse(
        new_accounts=new_accounts,
        active_users=active_users,
        journeys_planned=journeys_planned,
        feedback=feedback_stats,
        never_planned=never_planned,
        total_accounts=total_accounts,
        daily_last_30=daily_last_30,
    )


# ── Enhanced Admin Stats v2 (includes MongoDB + recent feedback) ──────────────

@router.get("/admin/stats/extended")
def admin_stats_extended(
    x_admin_key: str = Header(default=""),
    db: Session = Depends(get_db),
):
    """Extended stats including MongoDB collection counts, recent feedback, OAuth users, location count."""
    if x_admin_key != ADMIN_SECRET:
        raise HTTPException(status_code=403, detail="Invalid or missing admin key")

    from database.mongo import route_searches, recommendations
    from database.models import UserLocation

    # MongoDB counts
    try:
        mongo_route_searches = route_searches.count_documents({})
        mongo_recommendations = recommendations.count_documents({})
    except Exception:
        mongo_route_searches = 0
        mongo_recommendations = 0

    # Recent feedback (last 5)
    recent_fb = (
        db.query(UserFeedback)
        .order_by(UserFeedback.created_at.desc())
        .limit(5)
        .all()
    )
    recent_feedback_list = [
        {
            "id": f.id,
            "rating": f.rating,
            "text": (f.feedback_text[:120] + "…") if len(f.feedback_text) > 120 else f.feedback_text,
            "created_at": f.created_at.isoformat() if f.created_at else None,
            "user_id": f.user_id,
            "email": f.feedback_email,
        }
        for f in recent_fb
    ]

    # Google OAuth users
    google_users = db.query(func.count(Profile.profile_id)).filter(
        Profile.google_id.isnot(None)
    ).scalar() or 0

    # Users with location saved
    location_count = db.query(func.count(UserLocation.id)).scalar() or 0

    return {
        "mongodb": {
            "route_searches": mongo_route_searches,
            "recommendations": mongo_recommendations,
        },
        "google_oauth_users": google_users,
        "users_with_location": location_count,
        "recent_feedback": recent_feedback_list,
    }


# ── Admin Users List ─────────────────────────────────────────────────────────

@router.get("/admin/users")
def admin_users_list(
    x_admin_key: str = Header(default=""),
    db: Session = Depends(get_db),
):
    """Return detailed list of registered users for the admin modal."""
    if x_admin_key != ADMIN_SECRET:
        raise HTTPException(status_code=403, detail="Invalid or missing admin key")

    profiles = db.query(Profile).order_by(Profile.created_at.desc()).all()
    user_list = []
    for p in profiles:
        loc_str = None
        if p.location:
            loc_str = f"{p.location.city or ''}, {p.location.country or ''}".strip(", ")
        
        user_list.append({
            "profile_id": p.profile_id,
            "username": p.username,
            "email": p.email,
            "age": p.age,
            "created_at": p.created_at.isoformat() if p.created_at else None,
            "last_login": p.last_login.isoformat() if getattr(p, 'last_login', None) else None,
            "is_google": bool(getattr(p, 'google_id', None)),
            "avatar_url": getattr(p, 'avatar_url', None),
            "location": loc_str or "Not tracked yet",
            "journey_count": db.query(func.count(JourneyHistoryRecord.id)).filter(JourneyHistoryRecord.profile_id == p.profile_id).scalar() or 0
        })

    return {"users": user_list, "total": len(user_list)}
