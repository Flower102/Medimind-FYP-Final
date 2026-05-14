# backend/alembic/env.py
"""
Alembic migration environment.

This file connects Alembic to your existing FastAPI SQLAlchemy setup.

Important:
- It imports Base from app.db
- It imports app.models so Alembic can see User, Note, ChatSession, etc.
- It uses the same database engine as your app
"""

from logging.config import fileConfig

from alembic import context

from app.db import Base, engine
from app import models  # noqa: F401  # Needed so all models are registered on Base.metadata

config = context.config

if config.config_file_name is not None:
    fileConfig(config.config_file_name)

# Alembic compares your models against the real database using this metadata.
target_metadata = Base.metadata


def run_migrations_offline() -> None:
    """
    Offline migration mode.

    This generates SQL without connecting to the database.
    You will rarely use this in development, but Alembic expects it.
    """
    url = engine.url.render_as_string(hide_password=False)

    context.configure(
        url=url,
        target_metadata=target_metadata,
        literal_binds=True,
        dialect_opts={"paramstyle": "named"},
        compare_type=True,
    )

    with context.begin_transaction():
        context.run_migrations()


def run_migrations_online() -> None:
    """
    Online migration mode.

    This connects to the real database and applies migrations.
    This is what runs when you use:
      alembic upgrade head
    """
    with engine.connect() as connection:
        context.configure(
            connection=connection,
            target_metadata=target_metadata,
            compare_type=True,
        )

        with context.begin_transaction():
            context.run_migrations()


if context.is_offline_mode():
    run_migrations_offline()
else:
    run_migrations_online()