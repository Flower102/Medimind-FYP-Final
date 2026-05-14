"""add password reset fields

Revision ID: a5bdc8dd34d9
Revises: de89de0c6e22
Create Date: 2026-04-29
"""

from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


revision: str = "a5bdc8dd34d9"
down_revision: Union[str, None] = "de89de0c6e22"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.add_column("users", sa.Column("reset_code_hash", sa.String(length=128), nullable=True))
    op.add_column("users", sa.Column("reset_code_expires_at", sa.DateTime(), nullable=True))
    op.add_column("users", sa.Column("reset_attempts", sa.Integer(), nullable=False, server_default="0"))


def downgrade() -> None:
    op.drop_column("users", "reset_attempts")
    op.drop_column("users", "reset_code_expires_at")
    op.drop_column("users", "reset_code_hash")