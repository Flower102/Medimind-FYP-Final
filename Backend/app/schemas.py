# /app/schemas.py

# ---------------------------------------------------------------------
# Imports and Type Helpers
# ---------------------------------------------------------------------
# This section imports Pydantic, datetime, and typing tools used by API schemas.
# Schemas validate request bodies and shape the responses returned to the frontend.
# ---------------------------------------------------------------------
from pydantic import BaseModel, EmailStr, Field
from datetime import datetime
from pydantic import BaseModel
from typing import Optional, Literal


# ---------------------------------------------------------------------
# Authentication Request Schemas
# ---------------------------------------------------------------------
# These schemas validate signup, signin, and email verification requests.
# They make sure emails, passwords, and verification codes have the expected shape.
# ---------------------------------------------------------------------
class SignUpIn(BaseModel):
    first_name: str = Field(min_length=1, max_length=100)
    surname: str = Field(min_length=1, max_length=100)
    email: EmailStr
    password: str = Field(min_length=8, max_length=72)


class SignInIn(BaseModel):
    email: EmailStr
    password: str = Field(min_length=8, max_length=72)

class VerifyEmail(BaseModel):
    email: EmailStr
    code: str = Field(min_length=6, max_length=6, pattern=r"^\d{6}$")

class ResendVerify(BaseModel):
    email: EmailStr


# ---------------------------------------------------------------------
# Shared Authentication Response Schemas
# ---------------------------------------------------------------------
# These schemas define common outputs for tokens, user details, errors, and success.
# They keep frontend API handling consistent across authentication routes.
# ---------------------------------------------------------------------
class TokenResponse(BaseModel):
    access_token: str
    token_type: str = "bearer"


class UserOut(BaseModel):
    id: int
    email: EmailStr
    first_name: str | None = None
    surname: str | None = None
    display_name: str | None = None
    avatar_url: str | None = None

    class Config:
        from_attributes = True



# ---------------------------------------------------------------------
# Profile Update Schema
# ---------------------------------------------------------------------
# This schema describes editable profile fields for account settings.
# All fields are optional so the frontend can update one value at a time.
# ---------------------------------------------------------------------
class UserProfileUpdateIn(BaseModel):
    first_name: Optional[str] = Field(default=None, max_length=100)
    surname: Optional[str] = Field(default=None, max_length=100)
    display_name: Optional[str] = Field(default=None, max_length=150)


class ErrorOut(BaseModel):
    code: str
    message: str | None = None


class OkOut(BaseModel):
    ok: bool = True

# -------------------------
# Account / settings schemas
# -------------------------


# ---------------------------------------------------------------------
# Account Settings Schemas
# ---------------------------------------------------------------------
# These schemas support profile editing and password changes from Settings.
# They validate lengths before the route logic updates the database.
# ---------------------------------------------------------------------
class UserProfileUpdateIn(BaseModel):
    first_name: Optional[str] = Field(default=None, max_length=100)
    surname: Optional[str] = Field(default=None, max_length=100)
    display_name: Optional[str] = Field(default=None, max_length=150)


class ChangePasswordIn(BaseModel):
    current_password: str = Field(min_length=8, max_length=72)
    new_password: str = Field(min_length=8, max_length=72)    
    

# ---------------------------------------------------------------------
# Notes Schemas
# ---------------------------------------------------------------------
# These schemas define how notes are created, updated, and returned.
# They include learning metadata such as reflection, confidence, and favourite status.
# ---------------------------------------------------------------------
class NoteBase(BaseModel):
    title: Optional[str] = None
    content: str

    # Saved learning metadata.
    # These are no longer stored in frontend localStorage.
    reflection: Optional[str] = None
    confidence: int = Field(default=5, ge=1, le=10)
    is_favorite: bool = False


class NoteCreate(NoteBase):
    pass


class NoteUpdate(BaseModel):
    title: Optional[str] = None
    content: Optional[str] = None
    reflection: Optional[str] = None
    confidence: Optional[int] = Field(default=None, ge=1, le=10)
    is_favorite: Optional[bool] = None


class NoteOut(NoteBase):
    id: int
    user_id: int
    created_at: datetime | None = None
    updated_at: datetime | None = None

    class Config:
        from_attributes = True

# -------------------------
# Chat session schemas
# -------------------------


# ---------------------------------------------------------------------
# Chat Session Schemas
# ---------------------------------------------------------------------
# These schemas validate saved chatbot sessions and messages.
# They let the frontend save, list, favourite, and reopen AI conversations.
# ---------------------------------------------------------------------
class ChatMessageCreate(BaseModel):
    role: str
    content: str


class ChatMessageOut(BaseModel):
    id: int
    role: str
    content: str
    created_at: datetime

    class Config:
        from_attributes = True


class ChatSessionCreate(BaseModel):
    title: str | None = None
    messages: list[ChatMessageCreate] = Field(default_factory=list)

    # direct_chat = normal AI chat started from Chatbots page
    # learning_workspace = chat created from Learning Workspace notes/reflection/confidence
    source: Literal["direct_chat", "learning_workspace"] = "direct_chat"

    # Only used when source is learning_workspace.
    note_id: Optional[int] = None


class ChatSessionOut(BaseModel):
    id: int
    title: str
    is_favorite: bool = False

    # Returned to frontend so favourites can split chats correctly.
    source: Literal["direct_chat", "learning_workspace"] = "direct_chat"
    note_id: Optional[int] = None

    created_at: datetime
    updated_at: datetime

    class Config:
        from_attributes = True


class ChatSessionUpdate(BaseModel):
    title: str | None = None
    is_favorite: bool | None = None




class ChatSessionDetailOut(ChatSessionOut):
    messages: list[ChatMessageOut] = Field(default_factory=list)


# ---------------------------------------------------------------------
# Quiz Question and Attempt Schemas
# ---------------------------------------------------------------------
# These schemas describe quiz questions, answers, attempts, and results.
# They support both the live quiz page and the review/results screens.
# ---------------------------------------------------------------------
class QuizQuestionPublicOut(BaseModel):
    id: int
    position: int
    question: str
    options: list[str]
    selected_option_index: Optional[int] = None

    class Config:
        from_attributes = True


class QuizQuestionReviewOut(QuizQuestionPublicOut):
    correct_option_index: int
    explanation: Optional[str] = None
    is_correct: Optional[bool] = None


class QuizAttemptOut(BaseModel):
    id: int
    note_id: int
    title: str
    question_count: int
    reveal_mode: str
    timer_enabled: bool
    time_limit_seconds: Optional[int] = None
    started_at: datetime
    completed_at: Optional[datetime] = None
    questions: list[QuizQuestionPublicOut]

    class Config:
        from_attributes = True


class QuizAnswerIn(BaseModel):
    question_id: int
    selected_option_index: int = Field(ge=0, le=3)


class QuizSingleAnswerOut(BaseModel):
    question_id: int
    selected_option_index: int
    reveal_answer: bool

    # These are only returned when reveal_mode is "after_each".
    correct_option_index: Optional[int] = None
    is_correct: Optional[bool] = None
    explanation: Optional[str] = None


class QuizSubmitIn(BaseModel):
    answers: list[QuizAnswerIn] = Field(default_factory=list)

    # Frontend sends this when the quiz ends.
    time_taken_seconds: Optional[int] = Field(default=None, ge=0)


class QuizAttemptResultOut(BaseModel):
    id: int
    note_id: int
    title: str
    question_count: int
    correct_count: int
    score_percent: int
    reveal_mode: str
    timer_enabled: bool
    time_limit_seconds: Optional[int] = None
    time_taken_seconds: Optional[int] = None
    started_at: datetime
    completed_at: datetime
    questions: list[QuizQuestionReviewOut]

    class Config:
        from_attributes = True


class QuizAttemptSummaryOut(BaseModel):
    id: int
    note_id: int
    title: str
    question_count: int
    correct_count: Optional[int] = None
    score_percent: Optional[int] = None
    timer_enabled: bool
    time_taken_seconds: Optional[int] = None
    completed_at: Optional[datetime] = None
    created_at: datetime

    class Config:
        from_attributes = True


# ---------------------------------------------------------------------
# Password Reset and Delete Account Schemas
# ---------------------------------------------------------------------
# These schemas validate forgot-password, reset-code, reset-password, and delete-account forms.
# They keep security-sensitive account actions structured and predictable.
# ---------------------------------------------------------------------
class ForgotPasswordIn(BaseModel):
    email: EmailStr

class VerifyResetCodeIn(BaseModel):
    email: EmailStr
    code: str = Field(min_length=6, max_length=6, pattern=r"^\d{6}$")

class ResetPasswordIn(BaseModel):
    email: EmailStr
    code: str = Field(min_length=6, max_length=6, pattern=r"^\d{6}$")
    new_password: str = Field(min_length=8, max_length=72)


class DeleteAccountIn(BaseModel):
    current_password: Optional[str] = None
    confirm_text: str = Field(min_length=6, max_length=20)
