from sqlalchemy import (
    Boolean,
    Column,
    DateTime,
    ForeignKey,
    Integer,
    JSON,
    String,
    Text,
    func,
    text,
)
from sqlalchemy.orm import relationship

from .db import Base


# ---------------------------------------------------------------------
# User Table Model
# ---------------------------------------------------------------------
# This model stores account details, login information, and profile fields.
# Other learning data links back to this table through the user's id.
# ---------------------------------------------------------------------
class User(Base):
    __tablename__ = "users"

    id = Column(Integer, primary_key=True, index=True)

    email = Column(String(255), unique=True, index=True, nullable=False)
    password_hash = Column(String(255), nullable=False)

    first_name = Column(String(100), nullable=True)
    surname = Column(String(100), nullable=True)

    display_name = Column(String(150), nullable=True)
    avatar_url = Column(String(500), nullable=True)

    is_verified = Column(Boolean, nullable=False, default=False, server_default=text("false"))

    verify_code_hash = Column(String(128), nullable=True)
    verify_code_expires_at = Column(DateTime, nullable=True)
    verify_attempts = Column(Integer, nullable=False, default=0, server_default=text("0"))

    reset_code_hash = Column(String(128), nullable=True)
    reset_code_expires_at = Column(DateTime, nullable=True)
    reset_attempts = Column(Integer, nullable=False, default=0, server_default=text("0"))

    failed_login_attempts = Column(Integer, nullable=False, default=0, server_default=text("0"))
    lockout_until = Column(DateTime, nullable=True)

    auth_provider = Column(String(30), nullable=False, default="local", server_default="local")
    google_sub = Column(String(255), unique=True, index=True, nullable=True)

    created_at = Column(DateTime(timezone=True), server_default=func.now())

    refresh_tokens = relationship(
        "RefreshToken",
        back_populates="user",
        cascade="all, delete-orphan",
    )

    notes = relationship(
        "Note",
        back_populates="user",
        cascade="all, delete-orphan",
    )

    chat_sessions = relationship(
        "ChatSession",
        back_populates="user",
        cascade="all, delete-orphan",
    )


# ---------------------------------------------------------------------
# Refresh Token Table Model
# ---------------------------------------------------------------------
# This model stores refresh-token records used for sessions and sign-out-all.
# Revoked and replaced tokens help protect the account when sessions rotate.
# ---------------------------------------------------------------------
class RefreshToken(Base):
    __tablename__ = "refresh_tokens"

    id = Column(Integer, primary_key=True, index=True)
    jti = Column(String(64), unique=True, index=True, nullable=False)

    user_id = Column(
        Integer,
        ForeignKey("users.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )

    expires_at = Column(DateTime, nullable=False, index=True)
    revoked_at = Column(DateTime, nullable=True)
    replaced_by_jti = Column(String(64), nullable=True)

    created_at = Column(DateTime(timezone=True), server_default=func.now())

    user = relationship("User", back_populates="refresh_tokens")


# ---------------------------------------------------------------------
# Note Table Model
# ---------------------------------------------------------------------
# This model stores saved learning notes, reflections, confidence ratings, and favourites.
# Notes are the main learning records used by quizzes, progress, and chat sessions.
# ---------------------------------------------------------------------
class Note(Base):
    __tablename__ = "notes"

    id = Column(Integer, primary_key=True, index=True)

    user_id = Column(
        Integer,
        ForeignKey("users.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )

    title = Column(String(200), nullable=True)
    content = Column(Text, nullable=False)

    reflection = Column(Text, nullable=True)
    confidence = Column(Integer, nullable=False, default=5, server_default=text("5"))
    is_favorite = Column(Boolean, nullable=False, default=False, server_default=text("false"))

    created_at = Column(DateTime(timezone=True), server_default=func.now())

    updated_at = Column(
        DateTime(timezone=True),
        server_default=func.now(),
        onupdate=func.now(),
    )

    user = relationship("User", back_populates="notes")

    chat_sessions = relationship(
        "ChatSession",
        back_populates="note",
    )


# ---------------------------------------------------------------------
# Chat Session Table Model
# ---------------------------------------------------------------------
# This model stores one saved chatbot conversation and its source page.
# It links chats to users and optionally to a Learning Workspace note.
# ---------------------------------------------------------------------
class ChatSession(Base):
    __tablename__ = "chat_sessions"

    id = Column(Integer, primary_key=True, index=True)

    user_id = Column(
        Integer,
        ForeignKey("users.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )

    title = Column(
        String(200),
        nullable=False,
        default="New AI Learning Chat",
        server_default="New AI Learning Chat",
    )

    is_favorite = Column(
        Boolean,
        nullable=False,
        default=False,
        server_default=text("false"),
    )

    # direct_chat = created directly from Chatbots page
    # learning_workspace = created from Learning Workspace notes/reflection/confidence
    source = Column(
        String(40),
        nullable=False,
        default="direct_chat",
        server_default="direct_chat",
    )

    # Only Learning Workspace chats should normally have note_id.
    note_id = Column(
        Integer,
        ForeignKey("notes.id", ondelete="SET NULL"),
        nullable=True,
        index=True,
    )

    created_at = Column(DateTime(timezone=True), server_default=func.now())

    updated_at = Column(
        DateTime(timezone=True),
        server_default=func.now(),
        onupdate=func.now(),
    )

    # These two relationships were missing in your current code.
    # They are needed because User.chat_sessions and Note.chat_sessions use back_populates.
    user = relationship("User", back_populates="chat_sessions")

    note = relationship("Note", back_populates="chat_sessions")

    messages = relationship(
        "ChatMessage",
        back_populates="session",
        cascade="all, delete-orphan",
        order_by="ChatMessage.created_at",
    )


# ---------------------------------------------------------------------
# Chat Message Table Model
# ---------------------------------------------------------------------
# This model stores individual user and assistant messages inside a chat session.
# Deleting a chat session also deletes its messages through cascade rules.
# ---------------------------------------------------------------------
class ChatMessage(Base):
    __tablename__ = "chat_messages"

    id = Column(Integer, primary_key=True, index=True)

    session_id = Column(
        Integer,
        ForeignKey("chat_sessions.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )

    role = Column(String(20), nullable=False)
    content = Column(Text, nullable=False)

    created_at = Column(DateTime(timezone=True), server_default=func.now())

    session = relationship("ChatSession", back_populates="messages")


# ---------------------------------------------------------------------
# Quiz Attempt Table Model
# ---------------------------------------------------------------------
# This model stores one generated quiz attempt for a saved note.
# It tracks timing, score, completion state, and the related quiz questions.
# ---------------------------------------------------------------------
class QuizAttempt(Base):
    __tablename__ = "quiz_attempts"

    id = Column(Integer, primary_key=True, index=True)

    user_id = Column(
        Integer,
        ForeignKey("users.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )

    note_id = Column(
        Integer,
        ForeignKey("notes.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )

    title = Column(String(200), nullable=False)
    question_count = Column(Integer, nullable=False)
    reveal_mode = Column(String(20), nullable=False, default="end")

    timer_enabled = Column(Boolean, nullable=False, default=False, server_default=text("false"))
    time_limit_seconds = Column(Integer, nullable=True)
    time_taken_seconds = Column(Integer, nullable=True)

    correct_count = Column(Integer, nullable=True)
    score_percent = Column(Integer, nullable=True)

    started_at = Column(DateTime(timezone=True), server_default=func.now())
    completed_at = Column(DateTime(timezone=True), nullable=True)

    created_at = Column(DateTime(timezone=True), server_default=func.now())

    updated_at = Column(
        DateTime(timezone=True),
        server_default=func.now(),
        onupdate=func.now(),
    )

    user = relationship("User", backref="quiz_attempts")
    note = relationship("Note", backref="quiz_attempts")

    questions = relationship(
        "QuizQuestion",
        back_populates="attempt",
        cascade="all, delete-orphan",
        order_by="QuizQuestion.position",
    )


# ---------------------------------------------------------------------
# Quiz Question Table Model
# ---------------------------------------------------------------------
# This model stores each multiple-choice question inside a quiz attempt.
# It keeps the selected answer and correctness so quiz results can be reviewed later.
# ---------------------------------------------------------------------
class QuizQuestion(Base):
    __tablename__ = "quiz_questions"

    id = Column(Integer, primary_key=True, index=True)

    attempt_id = Column(
        Integer,
        ForeignKey("quiz_attempts.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )

    position = Column(Integer, nullable=False)
    question = Column(Text, nullable=False)
    options = Column(JSON, nullable=False)

    correct_option_index = Column(Integer, nullable=False)
    explanation = Column(Text, nullable=True)

    selected_option_index = Column(Integer, nullable=True)
    is_correct = Column(Boolean, nullable=True)

    created_at = Column(DateTime(timezone=True), server_default=func.now())

    attempt = relationship("QuizAttempt", back_populates="questions")
