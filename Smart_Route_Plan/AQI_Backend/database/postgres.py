from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker, declarative_base
from config import DATABASE_URL

try:
    # Use connect_timeout=3 for fast failover if local Postgres server is offline
    engine = create_engine(
        DATABASE_URL,
        pool_pre_ping=True,
        connect_args={"connect_timeout": 3} if "postgresql" in DATABASE_URL else {}
    )
    with engine.connect() as conn:
        pass
except Exception:
    # Fallback to local SQLite database when PostgreSQL is not running
    engine = create_engine(
        "sqlite:///./aqi_app.db",
        connect_args={"check_same_thread": False}
    )

SessionLocal = sessionmaker(
    autocommit=False,
    autoflush=False,
    bind=engine
)

Base = declarative_base()


def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()