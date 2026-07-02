# backend/app/note.py

"""
Notes CRUD API routes.

These endpoints are used by:
- Learning Workspace
- Favourites
- Progress summary

Each error now includes:
- code
- message
- action
so the frontend can show helpful plain-English feedback.
"""

# ---------------------------------------------------------------------
# Imports and Router Setup
# ---------------------------------------------------------------------
# This section imports FastAPI tools, database sessions, authentication, and schemas.
# The router groups all note-related endpoints under the /notes path.
# ---------------------------------------------------------------------
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from .db import get_db
from .deps import get_current_user
from . import models, schemas

router = APIRouter(prefix="/notes", tags=["Notes"])


# ---------------------------------------------------------------------
# Shared API Error Helper
# ---------------------------------------------------------------------
# This helper keeps note API errors consistent and easy for the frontend to display.
# It gives each error a code, a user-friendly message, and a suggested action.
# ---------------------------------------------------------------------
def raise_api_error(status_code: int, code: str, message: str, action: str):
    """
    Consistent backend error format.
    """

    raise HTTPException(
        status_code=status_code,
        detail={
            "code": code,
            "message": message,
            "action": action,
        },
    )


# ---------------------------------------------------------------------
# List Notes Route
# ---------------------------------------------------------------------
# This route returns all notes owned by the signed-in user.
# Notes are ordered by newest update so recent work appears first.
# ---------------------------------------------------------------------
@router.get("", response_model=list[schemas.NoteOut])
def list_notes(
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user),
):
    """
    Returns all notes belonging to the logged-in user.
    """

    return (
        db.query(models.Note)
        .filter(models.Note.user_id == current_user.id)
        .order_by(models.Note.updated_at.desc())
        .all()
    )


# ---------------------------------------------------------------------
# Create Note Route
# ---------------------------------------------------------------------
# This route saves a new learning note for the signed-in user.
# It validates that the content is not empty before writing to the database.
# ---------------------------------------------------------------------
@router.post("", response_model=schemas.NoteOut, status_code=status.HTTP_201_CREATED)
def create_note(
    payload: schemas.NoteCreate,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user),
):
    """
    Creates a new note.

    The frontend should send at least content.
    Reflection, confidence, and favourite status are optional learning fields.
    """

    if not (payload.content or "").strip():
        raise_api_error(
            status.HTTP_400_BAD_REQUEST,
            "NOTE_CONTENT_REQUIRED",
            "The note content is empty.",
            "Please write or paste some health information before saving the note.",
        )

    note = models.Note(
        user_id=current_user.id,
        title=payload.title,
        content=payload.content,
        reflection=payload.reflection,
        confidence=payload.confidence,
        is_favorite=payload.is_favorite,
    )

    db.add(note)
    db.commit()
    db.refresh(note)

    return note


# ---------------------------------------------------------------------
# Get Single Note Route
# ---------------------------------------------------------------------
# This route loads one saved note by id while checking ownership.
# The ownership check prevents users from opening someone else's note.
# ---------------------------------------------------------------------
@router.get("/{note_id}", response_model=schemas.NoteOut)
def get_note(
    note_id: int,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user),
):
    """
    Loads one note owned by the logged-in user.
    """

    note = (
        db.query(models.Note)
        .filter(models.Note.id == note_id, models.Note.user_id == current_user.id)
        .first()
    )

    if not note:
        raise_api_error(
            status.HTTP_404_NOT_FOUND,
            "NOTE_NOT_FOUND",
            "This note could not be found.",
            "It may have been deleted, or it may belong to a different account. Please refresh your notes list and try again.",
        )

    return note


# ---------------------------------------------------------------------
# Update Note Route
# ---------------------------------------------------------------------
# This route updates only the note fields sent by the frontend.
# It protects existing note data from being overwritten accidentally.
# ---------------------------------------------------------------------
@router.put("/{note_id}", response_model=schemas.NoteOut)
def update_note(
    note_id: int,
    payload: schemas.NoteUpdate,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user),
):
    """
    Updates a saved note.

    Pydantic tracks which fields were sent by the frontend, so fields can be
    updated one at a time without overwriting everything else.
    """

    note = (
        db.query(models.Note)
        .filter(models.Note.id == note_id, models.Note.user_id == current_user.id)
        .first()
    )

    if not note:
        raise_api_error(
            status.HTTP_404_NOT_FOUND,
            "NOTE_NOT_FOUND",
            "This note could not be found.",
            "Please refresh the page. If the note is no longer listed, create a new note instead.",
        )

    fields_sent = getattr(payload, "model_fields_set", set())

    if "content" in fields_sent and not (payload.content or "").strip():
        raise_api_error(
            status.HTTP_400_BAD_REQUEST,
            "NOTE_CONTENT_REQUIRED",
            "The note content cannot be empty.",
            "Please add note content before saving changes.",
        )

    if "title" in fields_sent:
        note.title = payload.title

    if "content" in fields_sent:
        note.content = payload.content

    if "reflection" in fields_sent:
        note.reflection = payload.reflection

    if "confidence" in fields_sent and payload.confidence is not None:
        note.confidence = payload.confidence

    if "is_favorite" in fields_sent and payload.is_favorite is not None:
        note.is_favorite = payload.is_favorite

    db.commit()
    db.refresh(note)

    return note


# ---------------------------------------------------------------------
# Delete Note Route
# ---------------------------------------------------------------------
# This route permanently removes one note owned by the signed-in user.
# It checks ownership first so one account cannot delete another account's note.
# ---------------------------------------------------------------------
@router.delete("/{note_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_note(
    note_id: int,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user),
):
    """
    Deletes one note owned by the logged-in user.
    """

    note = (
        db.query(models.Note)
        .filter(models.Note.id == note_id, models.Note.user_id == current_user.id)
        .first()
    )

    if not note:
        raise_api_error(
            status.HTTP_404_NOT_FOUND,
            "NOTE_NOT_FOUND",
            "This note could not be found.",
            "It may have already been deleted. Please refresh your saved notes list.",
        )

    db.delete(note)
    db.commit()

    return None
