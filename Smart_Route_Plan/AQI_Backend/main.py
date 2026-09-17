import logging
import os

# ── Logging ──────────────────────────────────────────────────────────────────
logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s  %(levelname)-8s  %(name)s  %(message)s",
    datefmt="%H:%M:%S",
)
logger = logging.getLogger("arogya.main")

from fastapi import FastAPI
from sqlalchemy import inspect, text
from fastapi.middleware.cors import CORSMiddleware
from routes.auth_routes import router as auth_router
from routes.ml_routes import router as ml_router
from database.postgres import engine, SessionLocal
from database.models import Base
from database.mongo import ensure_indexes
from database.seed_master_data import ensure_master_data
from services.website_content_service import drop_legacy_website_content_table, ensure_language_code_column
from config import FRONTEND_ORIGINS

app = FastAPI(
    title="AQI Route Recommendation API",
    version="2.0"
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=FRONTEND_ORIGINS,
    allow_origin_regex=r"http://(localhost|127\.0\.0\.1):\d+",
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*", "X-Admin-Key", "Authorization", "Content-Type"],
    expose_headers=["*"],
)

app.include_router(auth_router)
app.include_router(ml_router)

@app.on_event("startup")
def initialize_storage():
    Base.metadata.create_all(bind=engine)
    ensure_language_code_column(engine)
    drop_legacy_website_content_table(engine)
    # Lightweight compatibility migration for installations created before feedback emails.
    if "feedback_email" not in {c["name"] for c in inspect(engine).get_columns("user_feedback")}:
        with engine.begin() as connection:
            connection.execute(text("ALTER TABLE user_feedback ADD COLUMN feedback_email VARCHAR(255)"))
    ensure_master_data()
    ensure_indexes()

    # Startup diagnostics
    gid = os.getenv("GOOGLE_CLIENT_ID", "")
    if gid and "your_google_client_id" not in gid:
        logger.info(f"✅ Google OAuth: GOOGLE_CLIENT_ID loaded ({gid[:25]}...)")
    else:
        logger.warning("⚠️  GOOGLE_CLIENT_ID not configured — Google Sign-In will be disabled")
    logger.info(f"✅ CORS origins: {FRONTEND_ORIGINS}")

@app.get("/")
def root():
    return {
        "message": "AQI Backend v2 is running successfully"
    }

from routes.recommendation_routes import (
    router as recommendation_router
)

app.include_router(recommendation_router)
from routes.website_content_routes import router as website_content_router
app.include_router(website_content_router)
from routes.feedback_routes import router as feedback_router
app.include_router(feedback_router)
from routes.admin_routes import router as admin_router
app.include_router(admin_router)

