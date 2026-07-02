# backend/app/chat_sessions.py

"""
Chat Sessions API.

This file is used by:
- Chatbot list page
- Chatbot interaction page
- Favourites page if it reads favourite chats

It now returns clearer backend errors with:
- code: stable value for frontend mapping
- message: plain English explanation
- action: what the user/developer should do next
"""
# ---------------------------------------------------------------------
# Imports and Chat Router Setup
# ---------------------------------------------------------------------
# This section imports database, authentication, and schema tools for saved chat sessions.
# The router groups all chat-session endpoints under one API prefix.
# ---------------------------------------------------------------------


from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy import desc
from sqlalchemy.orm import Session

from .db import get_db
from .deps import get_current_user
from . import models, schemas

router = APIRouter(prefix="/chat-sessions", tags=["Chat Sessions"])


# ---------------------------------------------------------
# Shared error helper
# ---------------------------------------------------------

# ---------------------------------------------------------------------
# Shared API Error Helper
# ---------------------------------------------------------------------
# This helper raises backend errors in a consistent shape.
# It helps the frontend show clear messages and suggested actions.
# ---------------------------------------------------------------------

def raise_api_error(status_code: int, code: str, message: str, action: str):
    """
    Keeps all chat-session errors in one consistent format.

    Existing frontend code can still read:
      detail.code

    Improved frontend code can also show:
      detail.message
      detail.action
    """

    raise HTTPException(
        status_code=status_code,
        detail={
            "code": code,
            "message": message,
            "action": action,
        },
    )


# ---------------------------------------------------------
# Small helper functions
# ---------------------------------------------------------

# ---------------------------------------------------------------------
# Chat Title Helper
# ---------------------------------------------------------------------
# This helper creates a short title from the first user message.
# It makes saved chat sessions easier to recognise later.
# ---------------------------------------------------------------------

def create_title_from_text(text: str) -> str:
    """
    Creates a short chat title from the first user message.

    Example:
      "Please explain blood pressure readings..." -> "Please explain blood pressure readings..."
    """

    cleaned = " ".join((text or "").split()).strip()

    if not cleaned:
        return "New AI Learning Chat"

    return cleaned[:55] + "..." if len(cleaned) > 55 else cleaned


# ---------------------------------------------------------------------
# Chat Role Validation
# ---------------------------------------------------------------------
# This helper prevents invalid message roles from being saved.
# Only user and assistant messages should be stored in chat history.
# ---------------------------------------------------------------------

def validate_chat_role(role: str):
    """
    Only user and assistant messages should be saved as chat messages.

    This prevents invalid roles from being stored in the database.
    """

    if role not in ["user", "assistant"]:
        raise_api_error(
            status.HTTP_400_BAD_REQUEST,
            "INVALID_CHAT_ROLE",
            "This chat message has an invalid role.",
            "The message role must be either 'user' or 'assistant'. Please check the frontend message payload.",
        )


# ---------------------------------------------------------------------
# Chat Content Validation
# ---------------------------------------------------------------------
# This helper prevents empty chat messages from being saved.
# It keeps the database clean and avoids useless saved messages.
# ---------------------------------------------------------------------

def validate_chat_content(content: str):
    """
    Prevents empty chat messages being saved.
    """

    if not (content or "").strip():
        raise_api_error(
            status.HTTP_400_BAD_REQUEST,
            "EMPTY_CHAT_MESSAGE",
            "The chat message is empty.",
            "Please type a message before sending, or attach a file with a clear question.",
        )


# ---------------------------------------------------------------------
# Chat Ordering Helper
# ---------------------------------------------------------------------
# This helper chooses the best timestamp column for sorting chats.
# It keeps listing stable if model naming changed during development.
# ---------------------------------------------------------------------

def get_chat_session_order_column():
    """
    Supports either updated_at or updatedAt depending on how the SQLAlchemy
    model is written.

    This keeps the code safer if the model naming changed during development.
    """

    updated_at = getattr(models.ChatSession, "updated_at", None)

    if updated_at is not None:
        return updated_at

    updatedAt = getattr(models.ChatSession, "updatedAt", None)

    if updatedAt is not None:
        return updatedAt

    created_at = getattr(models.ChatSession, "created_at", None)

    if created_at is not None:
        return created_at

    return models.ChatSession.id


# ---------------------------------------------------------------------
# Chat Ownership Loader
# ---------------------------------------------------------------------
# This helper loads a chat session that belongs to the current user.
# It prevents users from opening or editing another account’s chat.
# ---------------------------------------------------------------------

def get_chat_session_or_404(
    session_id: int,
    db: Session,
    current_user: models.User,
) -> models.ChatSession:
    """
    Loads a chat session that belongs to the logged-in user.

    The user_id check is important:
    one user must not be able to access another user's saved chat.
    """

    session = (
        db.query(models.ChatSession)
        .filter(
            models.ChatSession.id == session_id,
            models.ChatSession.user_id == current_user.id,
        )
        .first()
    )

    if not session:
        raise_api_error(
            status.HTTP_404_NOT_FOUND,
            "CHAT_SESSION_NOT_FOUND",
            "This saved chat could not be found.",
            "It may have been deleted, or it may belong to a different account. Please refresh your chat list and try again.",
        )

    return session


# ---------------------------------------------------------
# Routes
# ---------------------------------------------------------

# ---------------------------------------------------------------------
# Create Chat Session Route
# ---------------------------------------------------------------------
# This route saves a new AI chat session and its initial messages.
# It also links Learning Workspace chats to notes when needed.
# ---------------------------------------------------------------------

@router.post(
    "",
    response_model=schemas.ChatSessionDetailOut,
    status_code=status.HTTP_201_CREATED,
)
def create_chat_session(
    payload: schemas.ChatSessionCreate,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user),
):
    """
    Creates a new saved chat session.

    This is important for favourites:
    - source="direct_chat" means it should appear under AI Chats.
    - source="learning_workspace" means it should appear under Notes.
    """

    initial_messages = getattr(payload, "messages", []) or []

    title = " ".join((payload.title or "New AI Learning Chat").split()).strip()

    if not title:
        title = "New AI Learning Chat"

    first_user_message = next(
        (
            message.content
            for message in initial_messages
            if message.role == "user" and (message.content or "").strip()
        ),
        None,
    )

    if title == "New AI Learning Chat" and first_user_message:
        title = create_title_from_text(first_user_message)

    # Only allow the two known source values.
    source = payload.source or "direct_chat"

    if source not in ["direct_chat", "learning_workspace"]:
        raise_api_error(
            status.HTTP_400_BAD_REQUEST,
            "INVALID_CHAT_SOURCE",
            "This chat has an invalid source.",
            "Use 'direct_chat' for normal chatbot conversations or 'learning_workspace' for chats created from saved notes.",
        )

    # Learning Workspace chats should have a note_id.
    # Direct chats should usually have note_id=None.
    note_id = payload.note_id if source == "learning_workspace" else None

    if source == "learning_workspace" and note_id is not None:
        note = (
            db.query(models.Note)
            .filter(
                models.Note.id == note_id,
                models.Note.user_id == current_user.id,
            )
            .first()
        )

        if not note:
            raise_api_error(
                status.HTTP_404_NOT_FOUND,
                "NOTE_NOT_FOUND",
                "The note linked to this chat could not be found.",
                "Please go back to Learning Workspace, save the note again, then start the AI summary again.",
            )

        # Only allow the two valid source values.
    source = payload.source

    if source not in ["direct_chat", "learning_workspace"]:
        source = "direct_chat"

    # Only Learning Workspace chats should keep note_id.
    note_id = payload.note_id if source == "learning_workspace" else None

    session = models.ChatSession(
        user_id=current_user.id,
        title=title,
        source=source,
        note_id=note_id,
    )

    db.add(session)
    db.flush()

    for item in initial_messages:
        validate_chat_role(item.role)
        validate_chat_content(item.content)

        message = models.ChatMessage(
            session_id=session.id,
            role=item.role,
            content=item.content.strip(),
        )

        db.add(message)

    db.commit()
    db.refresh(session)

    return session


# ---------------------------------------------------------------------
# List Chat Sessions Route
# ---------------------------------------------------------------------
# This route returns all saved chats for the signed-in user.
# Recent or updated chats are listed first for easier navigation.
# ---------------------------------------------------------------------

@router.get("", response_model=list[schemas.ChatSessionOut])
def list_chat_sessions(
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user),
):
    """
    Lists all saved chats for the logged-in user.

    Most recently updated chats appear first.
    """

    return (
        db.query(models.ChatSession)
        .filter(models.ChatSession.user_id == current_user.id)
        .order_by(desc(get_chat_session_order_column()))
        .all()
    )


# ---------------------------------------------------------------------
# Get Chat Session Route
# ---------------------------------------------------------------------
# This route loads one saved chat and its messages.
# It uses the ownership loader to keep private chats secure.
# ---------------------------------------------------------------------

@router.get("/{session_id}", response_model=schemas.ChatSessionDetailOut)
def get_chat_session(
    session_id: int,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user),
):
    """
    Loads one saved chat with its messages.
    """

    return get_chat_session_or_404(session_id, db, current_user)


# ---------------------------------------------------------------------
# Update Chat Session Route
# ---------------------------------------------------------------------
# This route updates chat title or favourite status.
# It only changes fields actually sent by the frontend.
# ---------------------------------------------------------------------

@router.patch("/{session_id}", response_model=schemas.ChatSessionDetailOut)
def update_chat_session(
    session_id: int,
    payload: schemas.ChatSessionUpdate,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user),
):
    """
    Updates a saved chat.

    Supported updates:
    - title
    - is_favorite

    Pydantic tells us which fields were actually sent, so we do not overwrite
    values accidentally.
    """

    session = get_chat_session_or_404(session_id, db, current_user)

    fields_sent = getattr(
        payload,
        "model_fields_set",
        getattr(payload, "__fields_set__", set()),
    )

    # Rename chat only if the frontend sent "title".
    if "title" in fields_sent:
        cleaned_title = " ".join((payload.title or "").split()).strip()

        if not cleaned_title:
            raise_api_error(
                status.HTTP_400_BAD_REQUEST,
                "EMPTY_CHAT_TITLE",
                "The chat title cannot be empty.",
                "Please enter a short title for the chat, then save again.",
            )

        if len(cleaned_title) > 150:
            raise_api_error(
                status.HTTP_400_BAD_REQUEST,
                "CHAT_TITLE_TOO_LONG",
                "The chat title is too long.",
                "Please shorten the title to 150 characters or fewer.",
            )

        session.title = cleaned_title

    # Favourite/unfavourite chat only if the frontend sent "is_favorite".
    if "is_favorite" in fields_sent:
        session.is_favorite = bool(payload.is_favorite)

    db.commit()
    db.refresh(session)

    return session


# ---------------------------------------------------------------------
# Add Chat Message Route
# ---------------------------------------------------------------------
# This route saves a new message inside an existing chat session.
# It validates role and content before writing to the database.
# ---------------------------------------------------------------------

@router.post(
    "/{session_id}/messages",
    response_model=schemas.ChatMessageOut,
    status_code=status.HTTP_201_CREATED,
)
def add_chat_message(
    session_id: int,
    payload: schemas.ChatMessageCreate,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user),
):
    """
    Adds one message to an existing saved chat.

    The chatbot page uses this after:
    - the user sends a message
    - the assistant returns a response
    """

    session = get_chat_session_or_404(session_id, db, current_user)

    validate_chat_role(payload.role)
    validate_chat_content(payload.content)

    cleaned_content = payload.content.strip()

    message = models.ChatMessage(
        session_id=session.id,
        role=payload.role,
        content=cleaned_content,
    )

    # Auto-title new chats using the first meaningful user message.
    if payload.role == "user" and session.title == "New AI Learning Chat":
        session.title = create_title_from_text(cleaned_content)

    db.add(message)
    db.commit()
    db.refresh(message)

    return message


# ---------------------------------------------------------------------
# Delete Chat Session Route
# ---------------------------------------------------------------------
# This route permanently deletes one saved chat session.
# Cascade rules remove its messages from the database as well.
# ---------------------------------------------------------------------

@router.delete("/{session_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_chat_session(
    session_id: int,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user),
):
    """
    Deletes one saved chat.

    The related messages should be deleted automatically if your SQLAlchemy
    relationship is set with cascade delete.
    """

    session = get_chat_session_or_404(session_id, db, current_user)

    db.delete(session)
    db.commit()

    return None