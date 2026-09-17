import os
from dotenv import load_dotenv

load_dotenv()

DATABASE_URL = os.getenv("DATABASE_URL")

MONGODB_URL = os.getenv("MONGODB_URL")
MONGODB_DB = os.getenv("MONGODB_DB", "aqi_routes")

SECRET_KEY = os.getenv("SECRET_KEY")
ALGORITHM = os.getenv("ALGORITHM")

ACCESS_TOKEN_EXPIRE_MINUTES = int(
    os.getenv("ACCESS_TOKEN_EXPIRE_MINUTES")
)

REFRESH_TOKEN_EXPIRE_DAYS = int(
    os.getenv("REFRESH_TOKEN_EXPIRE_DAYS")
)

# The public Nominatim service requires an identifying User-Agent. Replace the
# contact address before deploying outside a classroom/demo environment.
NOMINATIM_USER_AGENT = os.getenv(
    "NOMINATIM_USER_AGENT", "AQI-Route-Recommendation-Demo/2.0 (contact: your-email@example.com)"
)
OPENWEATHER_API_KEY = os.getenv("OPENWEATHER_API_KEY")
SARVAM_API_KEY = os.getenv("SARVAM_API_KEY", "")

# Comma-separated origins allowed to call the API from a browser.
FRONTEND_ORIGINS = [
    origin.strip() for origin in os.getenv(
        "FRONTEND_ORIGINS", "http://localhost:5173,http://127.0.0.1:5173,http://localhost:5174,http://127.0.0.1:5174"
    ).split(",") if origin.strip()
]

# SMTP & Invite Link Configuration
SMTP_HOST = os.getenv("SMTP_HOST", "smtp.gmail.com")
SMTP_PORT = int(os.getenv("SMTP_PORT", "587"))
SMTP_USER = os.getenv("SMTP_USER", "")
SMTP_PASSWORD = os.getenv("SMTP_PASSWORD", "")
SMTP_FROM_EMAIL = os.getenv("SMTP_FROM_EMAIL", "arogyaroute@gmail.com")
FRONTEND_URL = os.getenv("FRONTEND_URL", "http://localhost:5174")

