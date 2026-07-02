from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker, DeclarativeBase

from .settings import settings


# ---------------------------------------------------------------------
# Database Base Class
# ---------------------------------------------------------------------
# This section defines the shared SQLAlchemy base class used by all models.
# Every database table model inherits from this base so SQLAlchemy can create tables.
# ---------------------------------------------------------------------
class Base(DeclarativeBase):
    pass


# ---------------------------------------------------------------------
# Database Engine Configuration
# ---------------------------------------------------------------------
# This section creates the database engine using the DATABASE_URL from settings.
# SQLite receives a special thread setting so it works safely during local development.
# ---------------------------------------------------------------------
engine = create_engine(
    settings.DATABASE_URL,
    connect_args={"check_same_thread": False}
    if settings.DATABASE_URL.startswith("sqlite")
    else {},
)


# ---------------------------------------------------------------------
# Database Session Factory
# ---------------------------------------------------------------------
# This section creates new database sessions for each backend request.
# Sessions are configured without autocommit so changes are saved only when committed.
# ---------------------------------------------------------------------
SessionLocal = sessionmaker(bind=engine, autoflush=False, autocommit=False)


# ---------------------------------------------------------------------
# Request Database Dependency
# ---------------------------------------------------------------------
# This dependency gives API routes a database session and closes it afterwards.
# It prevents database connections staying open after the request has finished.
# ---------------------------------------------------------------------
def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()
