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
