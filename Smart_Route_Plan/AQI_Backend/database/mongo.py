from pymongo import MongoClient
from config import MONGODB_URL, MONGODB_DB

client = MongoClient(MONGODB_URL, serverSelectionTimeoutMS=2000)
db = client[MONGODB_DB]

route_searches = db["route_searches"]
recommendations = db["recommendations"]

def ensure_indexes():
    try:
        route_searches.create_index([("profile_id", 1), ("created_at", -1)])
        recommendations.create_index([("profile_id", 1), ("created_at", -1)])
    except Exception:
        pass
