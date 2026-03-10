from typing import Generator
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
from app.core.config import settings

connect_args = {"check_same_thread": False} if settings.DATABASE_URL.startswith("sqlite") else {}

# Create SQLAlchemy engine
# pool_pre_ping=True helps handle dropped connections
engine = create_engine(
    settings.DATABASE_URL, 
    pool_pre_ping=True,
    connect_args=connect_args
)

# Create a customized Session class
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)

def get_db() -> Generator:
    """
    Dependency function to get a database session for a request.
    It yields the session and automatically closes it when the request is done.
    """
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()
