from fastapi import FastAPI
from routes.auth_routes import router as auth_router
from routes.ml_routes import router as ml_router
from database.postgres import engine
from database.models import Base
from database.mongo import ensure_indexes
from database.seed_master_data import ensure_master_data

app = FastAPI(
    title="AQI Route Recommendation API",
    version="2.0"
)

app.include_router(auth_router)
app.include_router(ml_router)

@app.on_event("startup")
def initialize_storage():
    Base.metadata.create_all(bind=engine)
    ensure_master_data()
    ensure_indexes()

@app.get("/")
def root():
    return {
        "message": "AQI Backend v2 is running successfully"
    }

from routes.recommendation_routes import (
    router as recommendation_router
)

app.include_router(recommendation_router)
