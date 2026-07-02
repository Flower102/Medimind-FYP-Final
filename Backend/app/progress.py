# backend/app/progress.py
# Progress API.
#
# This endpoint gives the frontend one clean summary for:
# - Dashboard
# - Progress page
# - Dynamic learning insight
# - Suggested next step
# - Gentle in-app reminder
# - Motivation message
#
# Frontend calls:
#   GET /api/backend/progress/summary
#
# Next.js proxy forwards that to:
#   GET /progress/summary

# ---------------------------------------------------------------------
# Imports and Progress Router Setup
# ---------------------------------------------------------------------
# This section imports models, authentication, and response schemas for progress summaries.
# The router exposes dashboard and progress-page data through one summary endpoint.
# ---------------------------------------------------------------------

from __future__ import annotations

from datetime import datetime
from typing import Optional

from fastapi import APIRouter, Depends
from pydantic import BaseModel
from sqlalchemy.orm import Session

from .db import get_db
from .deps import get_current_user
from . import models

router = APIRouter(prefix="/progress", tags=["Progress"])


# ---------------------------------------------------------------------
# ProgressPointOut Schema or Data Model
# ---------------------------------------------------------------------
# This section defines the ProgressPointOut data shape used by the API.
# It helps validate input and return predictable responses to the frontend.
# ---------------------------------------------------------------------

class ProgressPointOut(BaseModel):
    label: str
    value: int


# ---------------------------------------------------------------------
# RecentQuizOut Schema or Data Model
# ---------------------------------------------------------------------
# This section defines the RecentQuizOut data shape used by the API.
# It helps validate input and return predictable responses to the frontend.
# ---------------------------------------------------------------------

class RecentQuizOut(BaseModel):
    id: str
    title: str
    score_percent: Optional[int] = None
    correct_count: Optional[int] = None
    question_count: int
    time_taken_seconds: Optional[int] = None
    completed_at: Optional[datetime] = None


# ---------------------------------------------------------------------
# LearningGoalOut Schema or Data Model
# ---------------------------------------------------------------------
# This section defines the LearningGoalOut data shape used by the API.
# It helps validate input and return predictable responses to the frontend.
# ---------------------------------------------------------------------

class LearningGoalOut(BaseModel):
    title: str
    current: int
    target: int


# ---------------------------------------------------------------------
# ReminderNoteOut Schema or Data Model
# ---------------------------------------------------------------------
# This section defines the ReminderNoteOut data shape used by the API.
# It helps validate input and return predictable responses to the frontend.
# ---------------------------------------------------------------------

class ReminderNoteOut(BaseModel):
    id: Optional[str] = None
    title: Optional[str] = None
    reason: str


# ---------------------------------------------------------------------
# ProgressSummaryOut Schema or Data Model
# ---------------------------------------------------------------------
# This section defines the ProgressSummaryOut data shape used by the API.
# It helps validate input and return predictable responses to the frontend.
# ---------------------------------------------------------------------

class ProgressSummaryOut(BaseModel):
    total_notes: int
    total_chat_sessions: int
    favourite_notes: int
    favourite_chats: int

    total_quizzes: int
    completed_quizzes: int
    average_quiz_score: int
    average_confidence: int

    quiz_score_points: list[ProgressPointOut]
    confidence_points: list[ProgressPointOut]
    recent_quizzes: list[RecentQuizOut]
    learning_goals: list[LearningGoalOut]

    insight: str
    motivation_message: str
    suggested_next_step: str
    gentle_reminder: str
    reminder_note: Optional[ReminderNoteOut] = None


# ---------------------------------------------------------------------
# Date Label Helper
# ---------------------------------------------------------------------
# This helper turns dates into short chart labels.
# It keeps progress graphs readable on the dashboard and progress page.
# ---------------------------------------------------------------------

def format_date_label(value: datetime | None) -> str:
    if value is None:
        return "Unknown"

    return value.strftime("%b %d")


# ---------------------------------------------------------------------
# Average Calculation Helper
# ---------------------------------------------------------------------
# This helper calculates rounded averages without dividing by zero.
# It returns 0 when there is no data yet.
# ---------------------------------------------------------------------

def safe_average(values: list[int]) -> int:
    if not values:
        return 0

    return round(sum(values) / len(values))


# ---------------------------------------------------------------------
# Note Title Helper
# ---------------------------------------------------------------------
# This helper chooses a readable note title for reminders and suggestions.
# It falls back safely when a note is missing or untitled.
# ---------------------------------------------------------------------

def get_note_title(note: models.Note | None) -> str:
    if note is None:
        return "your saved note"

    if note.title and note.title.strip():
        return note.title.strip()

    return "Untitled note"


# ---------------------------------------------------------------------
# Review Note Selector
# ---------------------------------------------------------------------
# This helper chooses the best note for the user to review next.
# It prioritises favourites, low confidence notes, and recent notes.
# ---------------------------------------------------------------------

def choose_review_note(notes: list[models.Note]) -> models.Note | None:
    if not notes:
        return None

    favourite_notes = [note for note in notes if note.is_favorite]

    if favourite_notes:
        return sorted(
            favourite_notes,
            key=lambda note: note.updated_at or note.created_at or datetime.min,
            reverse=True,
        )[0]

    low_confidence_notes = [
        note for note in notes
        if note.confidence is not None and int(note.confidence) <= 5
    ]

    if low_confidence_notes:
        return sorted(
            low_confidence_notes,
            key=lambda note: int(note.confidence or 0),
        )[0]

    return sorted(
        notes,
        key=lambda note: note.updated_at or note.created_at or datetime.min,
        reverse=True,
    )[0]


# ---------------------------------------------------------------------
# Progress Insight Builder
# ---------------------------------------------------------------------
# This helper creates a plain-English learning insight from user activity.
# It explains what the progress numbers mean in a helpful way.
# ---------------------------------------------------------------------

def build_progress_insight(
    total_notes: int,
    completed_quizzes: int,
    average_quiz_score: int,
    average_confidence: int,
    favourite_total: int,
) -> str:
    if total_notes == 0:
        return "You have not created a note yet. Once you save your first note, MediMind lite can help you review it, quiz yourself, and track your progress."

    if completed_quizzes == 0:
        return "You have started building your learning record by saving notes. The next useful step is to test what you remember with a short quiz."

    if average_quiz_score >= 80 and average_confidence >= 7:
        return "Your learning progress is looking strong. Your quiz scores and confidence both suggest that you are understanding your saved topics well."

    if average_quiz_score >= 80 and average_confidence < 7:
        return "Your quiz scores are strong, even if your confidence is still developing. This is a good sign because your results show you know more than you may feel."

    if average_quiz_score >= 60:
        return "You are making steady progress. Your quiz scores show that you are building understanding, and regular review can help push this even higher."

    if average_quiz_score < 50 and average_confidence >= 7:
        return "You feel confident, but your quiz results suggest the topic may need another review. This is useful feedback because it shows where to focus next."

    if average_confidence <= 4:
        return "Your confidence is still developing, so short and regular review sessions could help. Focus on one topic at a time rather than trying to revise everything at once."

    if favourite_total > 0:
        return "You have saved useful learning items. Revisit your favourites regularly so important information stays fresh."

    return "Keep going. Creating notes, reviewing them, and completing quizzes will help you see your learning improve over time."


# ---------------------------------------------------------------------
# Motivation Message Builder
# ---------------------------------------------------------------------
# This helper creates an encouraging message based on progress data.
# It gives the dashboard a supportive learning tone.
# ---------------------------------------------------------------------

def build_motivation_message(
    total_notes: int,
    completed_quizzes: int,
    average_quiz_score: int,
    average_confidence: int,
) -> str:
    if total_notes == 0:
        return (
            "Every learning journey starts with one small step. "
            "Create your first note today, even if it is short. "
            "Once it is saved, you can build from it with summaries, quizzes, and confidence tracking."
        )

    if completed_quizzes == 0:
        return (
            "You have already done the first important step by saving your notes. "
            "Now try one quiz to see what you remember. "
            "It does not need to be perfect — the result simply shows what to review next."
        )

    if average_quiz_score >= 80:
        return (
            "Great work — your results show strong progress. "
            "Keep reviewing little and often so the information stays fresh. "
            "Consistency will help you maintain this level and build confidence."
        )

    if average_quiz_score >= 60:
        return (
            "You are making good progress, and your results show that the effort is working. "
            "A little more practice can turn a good score into a stronger one. "
            "Keep going one topic at a time."
        )

    if average_confidence <= 4:
        return (
            "It is completely normal for some topics to feel difficult at first. "
            "Try reviewing one note slowly, then test yourself again. "
            "Small improvements still count as progress."
        )

    return (
        "Keep going — your work is building up over time. "
        "Short, regular review sessions can make a big difference. "
        "Focus on one useful action today, then come back again tomorrow."
    )


# ---------------------------------------------------------------------
# Suggested Next Step Builder
# ---------------------------------------------------------------------
# This helper recommends the next useful learning action.
# It adapts the suggestion based on notes, quizzes, confidence, and scores.
# ---------------------------------------------------------------------

def build_suggested_next_step(
    total_notes: int,
    completed_quizzes: int,
    average_quiz_score: int,
    average_confidence: int,
    review_note: models.Note | None,
) -> str:
    review_title = get_note_title(review_note)

    if total_notes == 0:
        return "Create your first learning note in the Learning Workspace."

    if completed_quizzes == 0:
        return f"Generate a quiz from {review_title} to check your understanding."

    if average_quiz_score < 50:
        return f"Review {review_title}, then retake a quiz to check improvement."

    if average_confidence <= 4:
        return f"Revisit {review_title} and update your confidence rating after reviewing it."

    if average_quiz_score >= 80:
        return "Keep your progress strong by reviewing one favourite note or completing another quiz."

    return f"Spend a few minutes reviewing {review_title}, then continue with another quiz."


# ---------------------------------------------------------------------
# Gentle Reminder Builder
# ---------------------------------------------------------------------
# This helper creates a small reminder for the dashboard.
# It encourages review without making the user feel pressured.
# ---------------------------------------------------------------------

def build_gentle_reminder(
    total_notes: int,
    completed_quizzes: int,
    average_quiz_score: int,
    average_confidence: int,
    favourite_total: int,
    review_note: models.Note | None,
) -> str:
    review_title = get_note_title(review_note)

    if total_notes == 0:
        return "Add one short health note today so you have something to review later."

    if completed_quizzes == 0:
        return f"You have saved notes ready to practise. Try a short quiz from {review_title}."

    if average_quiz_score < 50:
        return f"{review_title} may need another review because your quiz score is still developing."

    if average_confidence <= 4:
        return f"Your confidence is low, so revisiting {review_title} could help."

    if favourite_total > 0:
        return "Review one favourite item today to keep important information fresh."

    return "A short review session today can help you remember what you learned."


# ---------------------------------------------------------------------
# Reminder Note Builder
# ---------------------------------------------------------------------
# This helper packages the selected review note for the frontend.
# It gives the reminder panel a specific note to link back to.
# ---------------------------------------------------------------------

def build_reminder_note(notes: list[models.Note]) -> Optional[ReminderNoteOut]:
    review_note = choose_review_note(notes)

    if review_note is None:
        return None

    return ReminderNoteOut(
        id=str(review_note.id),
        title=get_note_title(review_note),
        reason="Suggested review item based on your saved notes, confidence ratings, and favourites.",
    )


# ---------------------------------------------------------------------
# Progress Summary Route
# ---------------------------------------------------------------------
# This route gathers notes, chats, quizzes, and confidence data for the user.
# It returns one complete summary used by Dashboard and Progress pages.
# ---------------------------------------------------------------------

@router.get("/summary", response_model=ProgressSummaryOut)
def get_progress_summary(
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user),
):
    notes = (
        db.query(models.Note)
        .filter(models.Note.user_id == current_user.id)
        .order_by(models.Note.created_at.asc())
        .all()
    )

    chat_sessions = (
        db.query(models.ChatSession)
        .filter(models.ChatSession.user_id == current_user.id)
        .all()
    )

    quiz_attempts = (
        db.query(models.QuizAttempt)
        .filter(models.QuizAttempt.user_id == current_user.id)
        .order_by(models.QuizAttempt.created_at.asc())
        .all()
    )

    completed_quiz_attempts = [
        attempt
        for attempt in quiz_attempts
        if attempt.completed_at is not None
    ]

    total_notes = len(notes)
    total_chat_sessions = len(chat_sessions)
    favourite_notes = len([note for note in notes if note.is_favorite])
    favourite_chats = len([chat for chat in chat_sessions if chat.is_favorite])

    total_quizzes = len(quiz_attempts)
    completed_quizzes = len(completed_quiz_attempts)

    quiz_scores = [
        int(attempt.score_percent)
        for attempt in completed_quiz_attempts
        if attempt.score_percent is not None
    ]

    confidence_values = [
        int(note.confidence)
        for note in notes
        if note.confidence is not None
    ]

    average_quiz_score = safe_average(quiz_scores)
    average_confidence = safe_average(confidence_values)

    quiz_score_points = [
        ProgressPointOut(
            label=format_date_label(attempt.completed_at),
            value=int(attempt.score_percent or 0),
        )
        for attempt in completed_quiz_attempts[-10:]
    ]

    confidence_points = [
        ProgressPointOut(
            label=format_date_label(note.created_at),
            value=int(note.confidence or 0),
        )
        for note in notes[-10:]
    ]

    recent_quizzes = [
        RecentQuizOut(
            id=str(attempt.id),
            title=attempt.title,
            score_percent=attempt.score_percent,
            correct_count=attempt.correct_count,
            question_count=attempt.question_count,
            time_taken_seconds=attempt.time_taken_seconds,
            completed_at=attempt.completed_at,
        )
        for attempt in reversed(completed_quiz_attempts[-5:])
    ]

    favourite_total = favourite_notes + favourite_chats
    review_note = choose_review_note(notes)

    learning_goals = [
        LearningGoalOut(
            title="Create 10 notes",
            current=min(total_notes, 10),
            target=10,
        ),
        LearningGoalOut(
            title="Complete 5 quizzes",
            current=min(completed_quizzes, 5),
            target=5,
        ),
        LearningGoalOut(
            title="Reach 80% average quiz score",
            current=min(average_quiz_score, 80),
            target=80,
        ),
        LearningGoalOut(
            title="Save 5 favourites",
            current=min(favourite_total, 5),
            target=5,
        ),
    ]

    insight = build_progress_insight(
        total_notes=total_notes,
        completed_quizzes=completed_quizzes,
        average_quiz_score=average_quiz_score,
        average_confidence=average_confidence,
        favourite_total=favourite_total,
    )

    motivation_message = build_motivation_message(
        total_notes=total_notes,
        completed_quizzes=completed_quizzes,
        average_quiz_score=average_quiz_score,
        average_confidence=average_confidence,
    )

    suggested_next_step = build_suggested_next_step(
        total_notes=total_notes,
        completed_quizzes=completed_quizzes,
        average_quiz_score=average_quiz_score,
        average_confidence=average_confidence,
        review_note=review_note,
    )

    gentle_reminder = build_gentle_reminder(
        total_notes=total_notes,
        completed_quizzes=completed_quizzes,
        average_quiz_score=average_quiz_score,
        average_confidence=average_confidence,
        favourite_total=favourite_total,
        review_note=review_note,
    )

    return ProgressSummaryOut(
        total_notes=total_notes,
        total_chat_sessions=total_chat_sessions,
        favourite_notes=favourite_notes,
        favourite_chats=favourite_chats,
        total_quizzes=total_quizzes,
        completed_quizzes=completed_quizzes,
        average_quiz_score=average_quiz_score,
        average_confidence=average_confidence,
        quiz_score_points=quiz_score_points,
        confidence_points=confidence_points,
        recent_quizzes=recent_quizzes,
        learning_goals=learning_goals,
        insight=insight,
        motivation_message=motivation_message,
        suggested_next_step=suggested_next_step,
        gentle_reminder=gentle_reminder,
        reminder_note=build_reminder_note(notes),
    )