# /app/schemas.py

from pydantic import BaseModel, EmailStr, Field
from datetime import datetime
from pydantic import BaseModel
from typing import Optional, Literal

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

class UserProfileUpdateIn(BaseModel):
    first_name: Optional[str] = Field(default=None, max_length=100)
    surname: Optional[str] = Field(default=None, max_length=100)
    display_name: Optional[str] = Field(default=None, max_length=150)


class ChangePasswordIn(BaseModel):
    current_password: str = Field(min_length=8, max_length=72)
    new_password: str = Field(min_length=8, max_length=72)    
    

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
