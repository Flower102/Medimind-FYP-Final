"""sync current schema

Revision ID: 688bf792103b
Revises:
Create Date: your original date
"""

from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa
from sqlalchemy import inspect


revision: str = "688bf792103b"
down_revision: Union[str, Sequence[str], None] = None
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def has_column(table_name: str, column_name: str) -> bool:
    """
    Check whether a column already exists before adding it.

    This is needed because these columns were already added once manually
    before Alembic was introduced.
    """
    bind = op.get_bind()
    inspector = inspect(bind)
    columns = inspector.get_columns(table_name)

    return any(column["name"] == column_name for column in columns)


def upgrade() -> None:
    """
    Add the new Learning Workspace fields to the notes table.

    This migration is safe to run even if the columns already exist.
    """

    if not has_column("notes", "reflection"):
        op.add_column(
            "notes",
            sa.Column("reflection", sa.Text(), nullable=True),
        )

    if not has_column("notes", "confidence"):
        op.add_column(
            "notes",
            sa.Column(
                "confidence",
                sa.Integer(),
                nullable=False,
                server_default="5",
            ),
        )

    if not has_column("notes", "is_favorite"):
        op.add_column(
            "notes",
            sa.Column(
                "is_favorite",
                sa.Boolean(),
                nullable=False,
                server_default=sa.text("0"),
            ),
        )


def downgrade() -> None:
    """
    Remove the Learning Workspace fields if this migration is rolled back.
    """

    if has_column("notes", "is_favorite"):
        op.drop_column("notes", "is_favorite")

    if has_column("notes", "confidence"):
        op.drop_column("notes", "confidence")

    if has_column("notes", "reflection"):
        op.drop_column("notes", "reflection")