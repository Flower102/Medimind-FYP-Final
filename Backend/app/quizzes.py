# backend/app/quizzes.py
# Fully implemented Quiz API.
#
# This file handles the full quiz flow:
# - Generate a quiz from a saved note using AI
# - Save the quiz attempt in the database
# - Save each quiz question in the database
# - Load a quiz attempt on the frontend quiz page
# - Save one answer at a time
# - Submit the quiz and calculate the score
# - Return review/result data after submission
#
# Important route style:
# The frontend currently calls:
#   /api/backend/quizzes/{attempt_id}
#   /api/backend/quizzes/{attempt_id}/answer
#   /api/backend/quizzes/{attempt_id}/submit
#
# The Next.js proxy forwards those to FastAPI as:
#   /quizzes/{attempt_id}
#   /quizzes/{attempt_id}/answer
#   /quizzes/{attempt_id}/submit
#
# So those routes MUST exist here.

# ---------------------------------------------------------------------
# Imports and Quiz Router Setup
# ---------------------------------------------------------------------
# This section imports AI, database, authentication, and validation tools for quiz features.
# The router groups the full quiz generation, answer, and submission flow.
# ---------------------------------------------------------------------

from __future__ import annotations

import json
from datetime import datetime
from typing import Any, Literal, Optional

import httpx
from fastapi import APIRouter, Depends, HTTPException, status
from pydantic import BaseModel, Field
from sqlalchemy.orm import Session, joinedload

from .db import get_db
from .deps import get_current_user
from .settings import settings
from . import models

router = APIRouter(prefix="/quizzes", tags=["Quizzes"])

# ---------------------------------------------------------------------
# Shared API Error Helper
# ---------------------------------------------------------------------
# This helper raises backend errors in a consistent shape.
# It helps the frontend show clear messages and suggested actions.
# ---------------------------------------------------------------------

def raise_api_error(status_code: int, code: str, message: str, action: str):
    """
    Consistent quiz API error format.

    Frontend can use:
    - detail.code for mapping
    - detail.message for plain English display
    - detail.action for next-step guidance
    """

    raise HTTPException(
        status_code=status_code,
        detail={
            "code": code,
            "message": message,
            "action": action,
        },
    )

# -------------------------
# Pydantic helper
# -------------------------

# ---------------------------------------------------------------------
# Camel/Snake Case Compatibility Model
# ---------------------------------------------------------------------
# This base schema accepts both camelCase and snake_case field names.
# It reduces frontend/backend naming mismatch problems.
# ---------------------------------------------------------------------

class CamelModel(BaseModel):
    """
    Allows the backend to accept both styles:
      snake_case: question_count
      camelCase: questionCount

    This helps prevent frontend/backend naming mismatches.
    """

    class Config:
        validate_by_name = True
        populate_by_name = True


# -------------------------
# Request schemas
# -------------------------

# ---------------------------------------------------------------------
# Quiz Generation Request Schema
# ---------------------------------------------------------------------
# This schema validates the request to generate a quiz from a saved note.
# It controls question count, reveal mode, timer settings, and note id.
# ---------------------------------------------------------------------

class QuizGenerateIn(CamelModel):
    # Frontend may send noteId, backend can also accept note_id.
    note_id: int = Field(alias="noteId")

    # Only 10, 15, or 20 are allowed later in validate_question_count().
    question_count: int = Field(default=10, alias="questionCount", ge=10, le=20)

    # "end" = show answers after submit.
    # "after_each" = show answer feedback after each question.
    reveal_mode: Literal["end", "after_each"] = Field(default="end", alias="revealMode")

    # Timer can be on or off.
    timer_enabled: bool = Field(default=True, alias="timerEnabled")

    # Frontend can send either minutes or seconds.
    # Seconds is better because the DB stores seconds.
    time_limit_minutes: Optional[int] = Field(
        default=None,
        alias="timeLimitMinutes",
        ge=1,
        le=120,
    )
    time_limit_seconds: Optional[int] = Field(
        default=None,
        alias="timeLimitSeconds",
        ge=60,
        le=7200,
    )


# ---------------------------------------------------------------------
# Single Answer Request Schema
# ---------------------------------------------------------------------
# This schema validates one selected answer during a quiz.
# It keeps question ids and option indexes within expected values.
# ---------------------------------------------------------------------

class QuizAnswerIn(CamelModel):
    # Frontend may send questionId.
    question_id: int = Field(alias="questionId")

    # Frontend may send selectedOptionIndex.
    selected_option_index: int = Field(alias="selectedOptionIndex", ge=0, le=3)


# ---------------------------------------------------------------------
# Submit Answer Schema
# ---------------------------------------------------------------------
# This schema supports submitting answers as part of final quiz submission.
# It keeps the backend flexible if the frontend sends all answers together.
# ---------------------------------------------------------------------

class QuizSubmitAnswerIn(CamelModel):
    # Optional: used only if frontend submits all answers at the end.
    question_id: int = Field(alias="questionId")
    selected_option_index: int = Field(alias="selectedOptionIndex", ge=0, le=3)


# ---------------------------------------------------------------------
# Quiz Submission Schema
# ---------------------------------------------------------------------
# This schema validates the final quiz submission payload.
# It can include saved answers and the time taken by the user.
# ---------------------------------------------------------------------

class QuizSubmitIn(CamelModel):
    # Optional list. Your current frontend saves answers one-by-one,
    # but this keeps the backend flexible.
    answers: list[QuizSubmitAnswerIn] = Field(default_factory=list)

    # Accept both snake_case and camelCase time values.
    time_taken_seconds: Optional[int] = Field(default=None, alias="timeTakenSeconds", ge=0)


# -------------------------
# AI generated quiz schemas
# -------------------------

# ---------------------------------------------------------------------
# Generated Question Schema
# ---------------------------------------------------------------------
# This schema validates one AI-generated quiz question.
# It ensures each question has options, the correct answer index, and an explanation.
# ---------------------------------------------------------------------

class GeneratedQuestion(BaseModel):
    question: str
    options: list[str]
    correct_option_index: int
    explanation: str


# ---------------------------------------------------------------------
# Generated Quiz Schema
# ---------------------------------------------------------------------
# This schema validates the full quiz returned by the AI.
# It is checked before the quiz is saved to the database.
# ---------------------------------------------------------------------

class GeneratedQuiz(BaseModel):
    title: str
    questions: list[GeneratedQuestion]


# -------------------------
# Validation helpers
# -------------------------

# ---------------------------------------------------------------------
# Question Count Validation
# ---------------------------------------------------------------------
# This helper only allows supported quiz lengths.
# It keeps the frontend options and backend behaviour aligned.
# ---------------------------------------------------------------------

def validate_question_count(question_count: int) -> None:
    """
    Keep quiz choices controlled.
    Only 10, 15, or 20 questions are allowed.
    """

    if question_count not in (10, 15, 20):
        raise_api_error(
            status.HTTP_400_BAD_REQUEST,
            "QUIZ_INVALID_QUESTION_COUNT",
            "The quiz question count is not valid.",
            "Please choose 10, 15, or 20 questions and try again.",
        )


# ---------------------------------------------------------------------
# Quiz Attempt Ownership Loader
# ---------------------------------------------------------------------
# This helper loads a quiz attempt belonging to the current user.
# It prevents users from accessing another account’s quiz attempt.
# ---------------------------------------------------------------------

def get_attempt_or_404(
    db: Session,
    attempt_id: int,
    current_user: models.User,
) -> models.QuizAttempt:
    """
    Loads one quiz attempt that belongs to the logged-in user.

    The user_id check is important:
    users must only access their own quiz attempts.
    """

    attempt = (
        db.query(models.QuizAttempt)
        .options(joinedload(models.QuizAttempt.questions))
        .filter(
            models.QuizAttempt.id == attempt_id,
            models.QuizAttempt.user_id == current_user.id,
        )
        .first()
    )

    if not attempt:
        raise HTTPException(
            status_code=404,
            detail={"code": "QUIZ_ATTEMPT_NOT_FOUND"},
        )

    return attempt


# ---------------------------------------------------------------------
# Quiz Question Loader
# ---------------------------------------------------------------------
# This helper loads a question from the current quiz attempt.
# It prevents answers being saved against the wrong quiz.
# ---------------------------------------------------------------------

def get_question_or_404(
    db: Session,
    attempt: models.QuizAttempt,
    question_id: int,
) -> models.QuizQuestion:
    """
    Loads one question from a specific quiz attempt.

    This prevents a user from answering a question that does not
    belong to the current quiz attempt.
    """

    question = (
        db.query(models.QuizQuestion)
        .filter(
            models.QuizQuestion.id == question_id,
            models.QuizQuestion.attempt_id == attempt.id,
        )
        .first()
    )

    if not question:
        raise HTTPException(
            status_code=404,
            detail={"code": "QUIZ_QUESTION_NOT_FOUND"},
        )

    return question


# -------------------------
# Response helpers
# -------------------------

# ---------------------------------------------------------------------
# Quiz Question Response Builder
# ---------------------------------------------------------------------
# This helper converts a database quiz question into frontend JSON.
# It hides or reveals correct answers depending on quiz state and reveal mode.
# ---------------------------------------------------------------------

def quiz_question_to_dict(
    attempt: models.QuizAttempt,
    question: models.QuizQuestion,
) -> dict:
    """
    Converts a database quiz question into frontend-friendly JSON.

    Important:
    - During the quiz, correct answers are hidden.
    - If reveal_mode is "after_each", answers are shown after the user answers.
    - After final submission, all answers and explanations are shown.
    """

    show_answer = False

    if attempt.completed_at is not None:
        show_answer = True

    if (
        attempt.reveal_mode == "after_each"
        and question.selected_option_index is not None
    ):
        show_answer = True

    return {
        "id": str(question.id),
        "position": question.position,
        "question": question.question,
        "options": question.options or [],
        "selectedOptionIndex": question.selected_option_index,
        "correctOptionIndex": question.correct_option_index if show_answer else None,
        "explanation": question.explanation if show_answer else None,
        "isCorrect": question.is_correct if show_answer else None,
    }


# ---------------------------------------------------------------------
# Quiz Attempt Response Builder
# ---------------------------------------------------------------------
# This helper converts a full quiz attempt into frontend JSON.
# It includes timing, score, completion state, and question data.
# ---------------------------------------------------------------------

def quiz_attempt_to_dict(attempt: models.QuizAttempt) -> dict:
    """
    Converts the whole quiz attempt into the shape used by the frontend.
    """

    return {
        "id": str(attempt.id),
        "noteId": str(attempt.note_id),
        "title": attempt.title,
        "questionCount": attempt.question_count,
        "revealMode": attempt.reveal_mode,
        "timerEnabled": attempt.timer_enabled,
        "timeLimitSeconds": attempt.time_limit_seconds,
        "timeTakenSeconds": attempt.time_taken_seconds,
        "correctCount": attempt.correct_count,
        "scorePercent": attempt.score_percent,
        "startedAt": attempt.started_at.isoformat() if attempt.started_at else None,
        "completedAt": attempt.completed_at.isoformat() if attempt.completed_at else None,
        "questions": [
            quiz_question_to_dict(attempt, question)
            for question in attempt.questions
        ],
    }


# ---------------------------------------------------------------------
# Quiz Summary Response Builder
# ---------------------------------------------------------------------
# This helper creates a smaller quiz-history response.
# It is useful for lists where full question data is not needed.
# ---------------------------------------------------------------------

def quiz_summary_to_dict(attempt: models.QuizAttempt) -> dict:
    """
    Smaller response for the quiz history/list page.
    """

    return {
        "id": str(attempt.id),
        "noteId": str(attempt.note_id),
        "title": attempt.title,
        "questionCount": attempt.question_count,
        "correctCount": attempt.correct_count,
        "scorePercent": attempt.score_percent,
        "timerEnabled": attempt.timer_enabled,
        "timeTakenSeconds": attempt.time_taken_seconds,
        "completedAt": attempt.completed_at.isoformat() if attempt.completed_at else None,
        "createdAt": attempt.created_at.isoformat() if attempt.created_at else None,
    }


# -------------------------
# OpenAI helpers
# -------------------------

# ---------------------------------------------------------------------
# OpenAI Text Extractor
# ---------------------------------------------------------------------
# This helper reads text from different OpenAI Responses API shapes.
# It supports both output_text and nested output content.
# ---------------------------------------------------------------------

def extract_openai_text(data: dict[str, Any]) -> str:
    """
    Reads text from the OpenAI Responses API response.

    Some responses contain output_text directly.
    Others contain nested output/content items.
    """

    output_text = data.get("output_text")

    if isinstance(output_text, str) and output_text.strip():
        return output_text.strip()

    text_parts: list[str] = []

    for item in data.get("output", []):
        for content_item in item.get("content", []):
            if content_item.get("type") in ["output_text", "text"]:
                text_value = content_item.get("text")
                if isinstance(text_value, str) and text_value.strip():
                    text_parts.append(text_value.strip())

    return "\n".join(text_parts).strip()


# ---------------------------------------------------------------------
# AI Quiz Parser
# ---------------------------------------------------------------------
# This helper validates and cleans the AI-generated quiz JSON.
# It makes sure every question has exactly four options before saving.
# ---------------------------------------------------------------------

def parse_ai_quiz(raw_text: str, expected_count: int) -> GeneratedQuiz:
    """
    Turns the AI JSON response into a GeneratedQuiz.

    This validates the quiz before it is saved.
    Every question must have exactly 4 options because the frontend
    is built as a 4-option multiple choice quiz.
    """

    cleaned = raw_text.strip()

    # Sometimes the AI returns ```json ... ```.
    # We remove that so json.loads can read it.
    if cleaned.startswith("```"):
        cleaned = cleaned.replace("```json", "").replace("```", "").strip()

    try:
        data = json.loads(cleaned)
    except Exception:
        raise HTTPException(
            status_code=502,
            detail={"code": "AI_QUIZ_BAD_JSON"},
        )

    try:
        generated = GeneratedQuiz.model_validate(data)
    except AttributeError:
        generated = GeneratedQuiz.parse_obj(data)
    except Exception:
        raise HTTPException(
            status_code=502,
            detail={"code": "AI_QUIZ_BAD_SHAPE"},
        )

    if len(generated.questions) != expected_count:
        raise HTTPException(
            status_code=502,
            detail={
                "code": "AI_QUIZ_WRONG_QUESTION_COUNT",
                "expected": expected_count,
                "received": len(generated.questions),
            },
        )

    for question in generated.questions:
        # Clean empty options first.
        question.options = [
            option.strip()
            for option in question.options
            if isinstance(option, str) and option.strip()
        ]

        # Do not save broken questions.
        # The AI must return exactly 4 choices.
        if len(question.options) != 4:
            raise HTTPException(
                status_code=502,
                detail={"code": "AI_QUIZ_OPTIONS_MUST_BE_FOUR"},
            )

        if question.correct_option_index < 0 or question.correct_option_index > 3:
            raise HTTPException(
                status_code=502,
                detail={"code": "AI_QUIZ_BAD_CORRECT_INDEX"},
            )

    return generated 


# ---------------------------------------------------------------------
# AI Quiz Generation Helper
# ---------------------------------------------------------------------
# This helper sends a saved note to OpenAI and asks for a quiz.
# It retries once if the AI returns invalid quiz JSON.
# ---------------------------------------------------------------------

async def generate_quiz_with_ai(
    note: models.Note,
    question_count: int,
) -> GeneratedQuiz:
    """
    Uses the user's saved note to generate a quiz.

    The quiz is generated in the backend so the OpenAI API key
    never goes into the frontend.

    If the AI returns bad JSON or a question without exactly 4 options,
    the backend retries once with stricter instructions.
    """

    if not settings.OPENAI_API_KEY:
        raise HTTPException(
            status_code=500,
            detail={"code": "OPENAI_API_KEY_MISSING"},
        )

    base_prompt = f"""
Create a multiple-choice quiz from the user's health learning note.

Return valid JSON only.

JSON shape:
{{
  "title": "Short quiz title",
  "questions": [
    {{
      "question": "Question text",
      "options": ["Option A", "Option B", "Option C", "Option D"],
      "correct_option_index": 0,
      "explanation": "Explain why the correct answer is correct."
    }}
  ]
}}

Strict rules:
- Generate exactly {question_count} questions.
- Every question must have exactly 4 options.
- Do not create 2-option or 3-option questions.
- Do not create true/false questions.
- correct_option_index must be 0, 1, 2, or 3.
- Make the questions varied, not repeated.
- Mix question styles:
  - understanding questions
  - detail questions
  - scenario questions
  - practical application questions
- Avoid repeating the same wording across questions.
- Keep the language simple and clear.
- This is for educational support only, not medical diagnosis or treatment.
- Do not include markdown.
- Do not include text outside the JSON.

Note title:
{note.title or "Untitled Note"}

Note content:
{note.content}

Personal reflection:
{note.reflection or ""}

Confidence level:
{note.confidence}/10
""".strip()

    headers = {
        "Content-Type": "application/json",
        "Authorization": f"Bearer {settings.OPENAI_API_KEY}",
    }

    last_error_code = "AI_QUIZ_GENERATION_FAILED"

    # Try twice. This prevents one bad AI response from breaking the quiz flow.
    for attempt_number in range(2):
        prompt = base_prompt

        if attempt_number == 1:
            prompt += """

IMPORTANT FIX:
Your previous response was invalid.
Return exactly the required JSON shape.
Every question must have exactly 4 answer options.
No question can have fewer or more than 4 options.
"""

        payload = {
            "model": settings.OPENAI_MODEL,
            "input": prompt,
            "temperature": 0.5,
        }

        try:
            async with httpx.AsyncClient(timeout=settings.OPENAI_TIMEOUT_SECONDS) as client:
                response = await client.post(
                    "https://api.openai.com/v1/responses",
                    json=payload,
                    headers=headers,
                )
        except httpx.RequestError as exc:
            print("OpenAI quiz network error:", exc)
            raise HTTPException(
                status_code=502,
                detail={"code": "OPENAI_QUIZ_NETWORK_ERROR"},
            )

        if response.status_code >= 400:
            print("OpenAI quiz error:", response.status_code, response.text)
            raise HTTPException(
                status_code=502,
                detail={"code": "OPENAI_QUIZ_UPSTREAM_ERROR"},
            )

        output_text = extract_openai_text(response.json())

        if not output_text:
            last_error_code = "OPENAI_QUIZ_EMPTY_RESPONSE"
            continue

        try:
            return parse_ai_quiz(output_text, question_count)
        except HTTPException as exc:
            detail = exc.detail

            if isinstance(detail, dict):
                last_error_code = detail.get("code", "AI_QUIZ_GENERATION_FAILED")
            else:
                last_error_code = "AI_QUIZ_GENERATION_FAILED"

            print("AI quiz validation failed. Retrying:", last_error_code)

    raise HTTPException(
        status_code=502,
        detail={"code": last_error_code},
    )

# -------------------------
# Routes
# -------------------------

# ---------------------------------------------------------------------
# List Quizzes Route
# ---------------------------------------------------------------------
# This route returns quiz attempts for the signed-in user.
# It supports quiz history and progress screens.
# ---------------------------------------------------------------------

@router.get("")
def list_quizzes(
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user),
):
    """
    Lists the logged-in user's quiz attempts.
    This can be used later for progress/history pages.
    """

    attempts = (
        db.query(models.QuizAttempt)
        .filter(models.QuizAttempt.user_id == current_user.id)
        .order_by(models.QuizAttempt.created_at.desc())
        .all()
    )

    return [quiz_summary_to_dict(attempt) for attempt in attempts]


# ---------------------------------------------------------------------
# Generate Quiz Route
# ---------------------------------------------------------------------
# This route creates a new quiz attempt from a saved note.
# It validates ownership, calls AI, and stores the attempt and questions.
# ---------------------------------------------------------------------

@router.post("/generate", status_code=status.HTTP_201_CREATED)
async def generate_quiz(
    payload: QuizGenerateIn,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user),
):
    """
    Generates a quiz from one saved note.

    Frontend should call:
      POST /api/backend/quizzes/generate

    Proxy forwards to:
      POST /quizzes/generate
    """

    validate_question_count(payload.question_count)

    note = (
        db.query(models.Note)
        .filter(
            models.Note.id == payload.note_id,
            models.Note.user_id == current_user.id,
        )
        .first()
    )

    if not note:
        raise HTTPException(
            status_code=404,
            detail={"code": "NOTE_NOT_FOUND"},
        )

    generated = await generate_quiz_with_ai(note, payload.question_count)

    if payload.timer_enabled:
        if payload.time_limit_seconds is not None:
            time_limit_seconds = payload.time_limit_seconds
        else:
            # If frontend sends minutes, convert to seconds.
            # If nothing is sent, use 1 minute per question.
            time_limit_minutes = payload.time_limit_minutes or payload.question_count
            time_limit_seconds = time_limit_minutes * 60
    else:
        time_limit_seconds = None

    attempt = models.QuizAttempt(
        user_id=current_user.id,
        note_id=note.id,
        title=generated.title[:200] or "Generated Quiz",
        question_count=payload.question_count,
        reveal_mode=payload.reveal_mode,
        timer_enabled=payload.timer_enabled,
        time_limit_seconds=time_limit_seconds,
    )

    db.add(attempt)
    db.flush()

    for index, question in enumerate(generated.questions, start=1):
        db_question = models.QuizQuestion(
            attempt_id=attempt.id,
            position=index,
            question=question.question,
            options=question.options,
            correct_option_index=question.correct_option_index,
            explanation=question.explanation,
        )
        db.add(db_question)

    db.commit()

    attempt = get_attempt_or_404(db, attempt.id, current_user)
    return quiz_attempt_to_dict(attempt)


# ---------------------------------------------------------------------
# Get Quiz Attempt Route
# ---------------------------------------------------------------------
# This route loads a saved quiz attempt for the frontend quiz page.
# It returns questions in the correct review or active state.
# ---------------------------------------------------------------------

@router.get("/{attempt_id}")
def get_quiz_attempt(
    attempt_id: int,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user),
):
    """
    Loads one quiz attempt.

    This fixes:
      GET /quizzes/2 -> 404 Not Found
    """

    attempt = get_attempt_or_404(db, attempt_id, current_user)
    return quiz_attempt_to_dict(attempt)


# ---------------------------------------------------------------------
# Answer Quiz Question Function
# ---------------------------------------------------------------------
# This section contains the answer_quiz_question function.
# It keeps this important part of the module separated and easier to review later.
# ---------------------------------------------------------------------

@router.post("/{attempt_id}/answer")
def answer_quiz_question(
    attempt_id: int,
    payload: QuizAnswerIn,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user),
):
    """
    Saves one answer.

    This fixes:
      POST /quizzes/4/answer -> 404 Not Found
    """

    attempt = get_attempt_or_404(db, attempt_id, current_user)

    if attempt.completed_at is not None:
        raise HTTPException(
            status_code=400,
            detail={"code": "QUIZ_ALREADY_SUBMITTED"},
        )

    question = get_question_or_404(db, attempt, payload.question_id)

    if payload.selected_option_index >= len(question.options):
        raise HTTPException(
            status_code=400,
            detail={"code": "INVALID_SELECTED_OPTION"},
        )

    is_correct = payload.selected_option_index == question.correct_option_index

    question.selected_option_index = payload.selected_option_index
    question.is_correct = is_correct

    db.commit()
    db.refresh(question)

    reveal_answer = attempt.reveal_mode == "after_each"

    return {
        "questionId": str(question.id),
        "selectedOptionIndex": question.selected_option_index,
        "revealAnswer": reveal_answer,
        "correctOptionIndex": question.correct_option_index if reveal_answer else None,
        "isCorrect": question.is_correct if reveal_answer else None,
        "explanation": question.explanation if reveal_answer else None,
    }


# ---------------------------------------------------------------------
# Submit Quiz Attempt Function
# ---------------------------------------------------------------------
# This section contains the submit_quiz_attempt function.
# It keeps this important part of the module separated and easier to review later.
# ---------------------------------------------------------------------

@router.post("/{attempt_id}/submit")
def submit_quiz_attempt(
    attempt_id: int,
    payload: QuizSubmitIn,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user),
):
    """
    Finishes the quiz attempt.

    This fixes:
      POST /quizzes/5/submit -> 404 Not Found
    """

    attempt = get_attempt_or_404(db, attempt_id, current_user)

    # If the user double-clicks submit, return the already saved result.
    if attempt.completed_at is not None:
        return quiz_attempt_to_dict(attempt)

    answers_by_question_id = {
        answer.question_id: answer.selected_option_index
        for answer in payload.answers
    }

    correct_count = 0
    total_questions = len(attempt.questions)

    if total_questions == 0:
        raise HTTPException(
            status_code=400,
            detail={"code": "QUIZ_HAS_NO_QUESTIONS"},
        )

    for question in attempt.questions:
        # If frontend submits answers at the end, save them here too.
        if question.id in answers_by_question_id:
            selected = answers_by_question_id[question.id]

            if selected < 0 or selected >= len(question.options):
                raise HTTPException(
                    status_code=400,
                    detail={"code": "INVALID_SELECTED_OPTION"},
                )

            question.selected_option_index = selected

        # Unanswered questions count as incorrect.
        if question.selected_option_index is None:
            question.is_correct = False
        else:
            question.is_correct = (
                question.selected_option_index == question.correct_option_index
            )

        if question.is_correct:
            correct_count += 1

    score_percent = int(round((correct_count / total_questions) * 100))

    attempt.correct_count = correct_count
    attempt.score_percent = score_percent
    attempt.time_taken_seconds = payload.time_taken_seconds
    attempt.completed_at = datetime.utcnow()

    db.commit()

    attempt = get_attempt_or_404(db, attempt_id, current_user)
    return quiz_attempt_to_dict(attempt)


# ---------------------------------------------------------------------
# Get Quiz Result Function
# ---------------------------------------------------------------------
# This section contains the get_quiz_result function.
# It keeps this important part of the module separated and easier to review later.
# ---------------------------------------------------------------------

@router.get("/{attempt_id}/result")
def get_quiz_result(
    attempt_id: int,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user),
):
    """
    Loads the final quiz result.

    Only works after the quiz has been submitted.
    """

    attempt = get_attempt_or_404(db, attempt_id, current_user)

    if attempt.completed_at is None:
        raise HTTPException(
            status_code=400,
            detail={"code": "QUIZ_NOT_SUBMITTED"},
        )

    return quiz_attempt_to_dict(attempt)


# ---------------------------------------------------------------------
# Delete Quiz Attempt Function
# ---------------------------------------------------------------------
# This section contains the delete_quiz_attempt function.
# It keeps this important part of the module separated and easier to review later.
# ---------------------------------------------------------------------

@router.delete("/{attempt_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_quiz_attempt(
    attempt_id: int,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user),
):
    """
    Deletes one quiz attempt and its questions.

    The database relationship should cascade-delete the questions.
    """

    attempt = get_attempt_or_404(db, attempt_id, current_user)

    db.delete(attempt)
    db.commit()

    return None


# -------------------------
# Backwards-compatible routes
# -------------------------
# These keep old frontend calls working if any old code still calls:
#   /quizzes/attempts/{attempt_id}/...
#
# Your current frontend should use the shorter routes above.

# ---------------------------------------------------------------------
# Get Quiz Attempt Old Path Function
# ---------------------------------------------------------------------
# This section contains the get_quiz_attempt_old_path function.
# It keeps this important part of the module separated and easier to review later.
# ---------------------------------------------------------------------

@router.get("/attempts/{attempt_id}")
def get_quiz_attempt_old_path(
    attempt_id: int,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user),
):
    attempt = get_attempt_or_404(db, attempt_id, current_user)
    return quiz_attempt_to_dict(attempt)


# ---------------------------------------------------------------------
# Answer Quiz Question Old Path Function
# ---------------------------------------------------------------------
# This section contains the answer_quiz_question_old_path function.
# It keeps this important part of the module separated and easier to review later.
# ---------------------------------------------------------------------

@router.post("/attempts/{attempt_id}/answer")
def answer_quiz_question_old_path(
    attempt_id: int,
    payload: QuizAnswerIn,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user),
):
    return answer_quiz_question(attempt_id, payload, db, current_user)


# ---------------------------------------------------------------------
# Submit Quiz Attempt Old Path Function
# ---------------------------------------------------------------------
# This section contains the submit_quiz_attempt_old_path function.
# It keeps this important part of the module separated and easier to review later.
# ---------------------------------------------------------------------

@router.post("/attempts/{attempt_id}/submit")
def submit_quiz_attempt_old_path(
    attempt_id: int,
    payload: QuizSubmitIn,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user),
):
    return submit_quiz_attempt(attempt_id, payload, db, current_user)


# ---------------------------------------------------------------------
# Get Quiz Result Old Path Function
# ---------------------------------------------------------------------
# This section contains the get_quiz_result_old_path function.
# It keeps this important part of the module separated and easier to review later.
# ---------------------------------------------------------------------

@router.get("/attempts/{attempt_id}/result")
def get_quiz_result_old_path(
    attempt_id: int,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user),
):
    return get_quiz_result(attempt_id, db, current_user)


# ---------------------------------------------------------------------
# Delete Quiz Attempt Old Path Function
# ---------------------------------------------------------------------
# This section contains the delete_quiz_attempt_old_path function.
# It keeps this important part of the module separated and easier to review later.
# ---------------------------------------------------------------------

@router.delete("/attempts/{attempt_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_quiz_attempt_old_path(
    attempt_id: int,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user),
):
    return delete_quiz_attempt(attempt_id, db, current_user)