# app/main.py
# ---------------------------------------------------------------------
# Imports, App Setup, and Router Registration
# ---------------------------------------------------------------------
# This section imports FastAPI, authentication, database, OAuth, routers, and storage tools.
# It creates the main backend app and connects shared services used across the project.
# ---------------------------------------------------------------------

from fastapi import FastAPI, Depends, HTTPException, Request, Response, status, BackgroundTasks
from fastapi.middleware.cors import CORSMiddleware
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer
from sqlalchemy.orm import Session
from sqlalchemy import select, delete, update
from datetime import datetime, timedelta
from slowapi import Limiter, _rate_limit_exceeded_handler
from slowapi.util import get_remote_address
from slowapi.errors import RateLimitExceeded
from . import models
from .schemas import (
    SignUpIn,
    SignInIn,
    VerifyEmail,
    ResendVerify,
    UserOut,
    OkOut,
    UserProfileUpdateIn,
    ChangePasswordIn,
    DeleteAccountIn,
    ForgotPasswordIn,
    VerifyResetCodeIn,
    ResetPasswordIn,
)

from .security import (
    create_refresh_token,
    decode_and_validate,
    hash_password,
    verify_password,
    create_access_token,
    generate_6_digit_code,
    hash_verify_code,
    verify_code_matches,
    expires_in_minutes,
)
from app.emailer import send_verification_email
from app.settings import settings
from .db import Base, engine, get_db
from .models import User, RefreshToken
from .note import router as notes_router
from .ai import router as ai_router 
from .chat_sessions import router as chat_sessions_router
from .quizzes import router as quizzes_router
from .progress import router as progress_router
import os
import uuid
from pathlib import Path
from fastapi import UploadFile, File
from fastapi.staticfiles import StaticFiles
from sqlalchemy import select
from authlib.integrations.starlette_client import OAuth
from starlette.responses import RedirectResponse
from starlette.middleware.sessions import SessionMiddleware
from fastapi.responses import JSONResponse
from fastapi.exceptions import RequestValidationError
from starlette.exceptions import HTTPException as StarletteHTTPException
from supabase import create_client

#Add OAuth
oauth = OAuth()

oauth.register(
    name="google",
    client_id=settings.GOOGLE_CLIENT_ID,
    client_secret=settings.GOOGLE_CLIENT_SECRET,
    server_metadata_url="https://accounts.google.com/.well-known/openid-configuration",
    client_kwargs={
        "scope": "openid email profile",
    },
)
app = FastAPI(title="MediMind Backend")

Base.metadata.create_all(bind=engine)
# ---------------------------------------------------------------------
# Plain-English API error messages
# ---------------------------------------------------------------------
# This keeps your technical error codes for debugging, but also sends a
# clear message that the frontend can show to normal users.
# Example response:
# {
#   "detail": {
#     "code": "AUTH_INVALID_CREDENTIALS",
#     "message": "The email or password is incorrect. Please check your details and try again."
#   }
# }
# ---------------------------------------------------------------------

from fastapi.responses import JSONResponse
from fastapi.exceptions import RequestValidationError
from starlette.exceptions import HTTPException as StarletteHTTPException


ERROR_MESSAGES = {
    # General errors
    "HTTP_ERROR": "Something went wrong. Please try again.",
    "SERVER_ERROR": "The server had a problem. Please try again later.",
    "VALIDATION_ERROR": "Some details are missing or invalid. Please check the form and try again.",
    "RATE_LIMITED": "Too many attempts. Please wait a moment and try again.",

    # Authentication and sessions
    "AUTH_MISSING_TOKEN": "You are not signed in. Please sign in again.",
    "AUTH_INVALID_TOKEN": "Your session has expired or is invalid. Please sign in again.",
    "AUTH_USER_NOT_FOUND": "No account was found with these details.",
    "AUTH_EMAIL_IN_USE": "This email address is already registered. Please sign in instead.",
    "AUTH_INVALID_CREDENTIALS": "The email or password is incorrect. Please check your details and try again.",
    "AUTH_EMAIL_NOT_VERIFIED": "Your email address has not been verified yet. Please check your email for the verification code.",
    "AUTH_LOCKED_TRY_LATER": "Too many failed sign-in attempts. Please wait a few minutes and try again.",
    "AUTH_USE_GOOGLE_SIGNIN": "This account uses Google sign-in. Please continue with Google instead.",

    # Password rules
    "AUTH_PASSWORD_TOO_SHORT": "Password is too short. It must be at least 8 characters.",
    "AUTH_PASSWORD_TOO_LONG": "Password is too long. Please choose a shorter password.",
    "AUTH_PASSWORD_NEEDS_MIXED_CASE": "Password must include both uppercase and lowercase letters.",
    "AUTH_PASSWORD_NEEDS_NUMBER": "Password must include at least one number.",
    "AUTH_PASSWORD_NEEDS_SYMBOL": "Password must include at least one special character.",
    "AUTH_PASSWORD_SAME_AS_OLD": "Your new password cannot be the same as your current password. Please choose a different password.",
    "AUTH_CURRENT_PASSWORD_INCORRECT": "Your current password is incorrect.",

    # Email verification
    "AUTH_NO_VERIFY_CODE": "There is no verification code for this account. Please request a new code.",
    "AUTH_VERIFY_CODE_EXPIRED": "This verification code has expired. Please request a new code.",
    "AUTH_VERIFY_CODE_INVALID": "The verification code is incorrect. Please check the code and try again.",
    "AUTH_TOO_MANY_ATTEMPTS": "Too many attempts. Please request a new code or try again later.",

    # Refresh token/session
    "AUTH_MISSING_REFRESH": "Your session has expired. Please sign in again.",
    "AUTH_INVALID_REFRESH": "Your session is invalid. Please sign in again.",
    "AUTH_REFRESH_REVOKED": "Your session is no longer active. Please sign in again.",
    "AUTH_REFRESH_EXPIRED": "Your session has expired. Please sign in again.",
    "AUTH_REFRESH_REUSE_DETECTED": "For your security, this session has been ended. Please sign in again.",

    # Forgotten password / reset code
    "RESET_CODE_INVALID": "The reset code is incorrect. Please check the code and try again.",
    "RESET_CODE_MISSING": "No reset code was found. Please request a new password reset code.",
    "RESET_CODE_EXPIRED": "This reset code has expired. Please request a new code.",
    "RESET_TOO_MANY_ATTEMPTS": "Too many reset attempts. Please wait and try again later.",

    # Google sign-in
    "GOOGLE_AUTH_NOT_CONFIGURED": "Google sign-in is not set up correctly yet.",
    "GOOGLE_AUTH_FAILED": "Google sign-in could not be completed. Please try again.",
    "GOOGLE_USERINFO_FAILED": "Google sign-in worked, but we could not read your Google account details.",
    "GOOGLE_MISSING_ACCOUNT_INFO": "Google did not return the account information needed to sign you in.",

    # Profile/avatar
    "AVATAR_INVALID_FILE_TYPE": "Please upload a valid image file. Supported formats are JPG, PNG, and WebP.",
    "AVATAR_FILE_TOO_LARGE": "The profile picture is too large. Please upload an image smaller than 2 MB.",
    "USERNAME_ALREADY_TAKEN": "This username is already taken. Please choose another one.",

    #/Delete Account
    "AUTH_DELETE_CONFIRM_REQUIRED": "Please type DELETE to confirm account deletion.",
    "AUTH_DELETE_PASSWORD_REQUIRED": "Please enter your current password to delete your account.",
    "AUTH_DELETE_PASSWORD_INCORRECT": "The current password is incorrect. Your account was not deleted.",
}


STATUS_FALLBACK_MESSAGES = {
    400: "The request was not valid. Please check your details and try again.",
    401: "You are not authorised. Please sign in again.",
    403: "You do not have permission to do this.",
    404: "The requested item could not be found.",
    409: "There is a conflict with existing information.",
    422: "Some details are missing or invalid.",
    429: "Too many attempts. Please wait and try again.",
    500: "The server had a problem. Please try again later.",
}


# ---------------------------------------------------------------------
# Readable Error Builder
# ---------------------------------------------------------------------
# This helper converts raw backend errors into clear error objects.
# It keeps API responses useful for both frontend display and debugging.
# ---------------------------------------------------------------------

def build_error_detail(status_code: int, detail):
    """-
    Converts every backend error into a clean structure:
    {
      "code": "...",
      "message": "Plain English message..."
    }
    """

    fallback_message = STATUS_FALLBACK_MESSAGES.get(
        status_code,
        "Something went wrong. Please try again.",
    )

    if isinstance(detail, dict):
        code = detail.get("code") or f"HTTP_{status_code}"
        message = detail.get("message") or ERROR_MESSAGES.get(code) or fallback_message

        clean_detail = dict(detail)
        clean_detail["code"] = code
        clean_detail["message"] = message

        return clean_detail

    if isinstance(detail, str):
        if detail.isupper() or "_" in detail:
            return {
                "code": detail,
                "message": ERROR_MESSAGES.get(detail, fallback_message),
            }

        return {
            "code": f"HTTP_{status_code}",
            "message": detail,
        }

    return {
        "code": f"HTTP_{status_code}",
        "message": fallback_message,
    }


# ---------------------------------------------------------------------
# Controlled API Error Helper
# ---------------------------------------------------------------------
# This helper raises known backend errors using shared error codes and messages.
# It avoids repeating the same HTTPException structure across routes.
# ---------------------------------------------------------------------

def api_error(code: str, http_status: int):
    """
    Use this when you want to raise a controlled backend error.
    It sends both:
    - a machine-readable code
    - a human-readable message
    """

    raise HTTPException(
        status_code=http_status,
        detail={
            "code": code,
            "message": ERROR_MESSAGES.get(
                code,
                STATUS_FALLBACK_MESSAGES.get(http_status, "Something went wrong. Please try again."),
            ),
        },
    )


# ---------------------------------------------------------------------
# HTTP Error Handler
# ---------------------------------------------------------------------
# This handler formats expected FastAPI errors before sending them to the frontend.
# It makes older and newer error styles return the same clean shape.
# ---------------------------------------------------------------------

@app.exception_handler(StarletteHTTPException)
async def readable_http_exception_handler(request: Request, exc: StarletteHTTPException):
    """
    Handles normal HTTPException errors.
    This also catches old errors where you only returned {"code": "..."}.
    """

    return JSONResponse(
        status_code=exc.status_code,
        content={
            "detail": build_error_detail(exc.status_code, exc.detail),
        },
    )


# ---------------------------------------------------------------------
# Validation Error Handler
# ---------------------------------------------------------------------
# This handler formats Pydantic validation errors into a simple message.
# It prevents technical validation details from confusing normal users.
# ---------------------------------------------------------------------

@app.exception_handler(RequestValidationError)
async def readable_validation_exception_handler(request: Request, exc: RequestValidationError):
    """
    Handles FastAPI/Pydantic validation errors.
    Example: missing field, wrong type, invalid request body.
    """

    detail = {
        "code": "VALIDATION_ERROR",
        "message": ERROR_MESSAGES["VALIDATION_ERROR"],
    }

    if settings.ENV == "dev":
        detail["fields"] = exc.errors()

    return JSONResponse(
        status_code=422,
        content={"detail": detail},
    )


# ---------------------------------------------------------------------
# Rate Limit Error Handler
# ---------------------------------------------------------------------
# This handler returns a friendly message when users send too many requests.
# It supports safer login, verification, and reset-code flows.
# ---------------------------------------------------------------------

async def readable_rate_limit_handler(request: Request, exc: RateLimitExceeded):
    """
    Handles too many requests.
    Example: user tries too many login attempts too quickly.
    """

    return JSONResponse(
        status_code=429,
        content={
            "detail": {
                "code": "RATE_LIMITED",
                "message": ERROR_MESSAGES["RATE_LIMITED"],
            }
        },
    )


app.add_exception_handler(RateLimitExceeded, readable_rate_limit_handler)


# ---------------------------------------------------------------------
# Unexpected Server Error Handler
# ---------------------------------------------------------------------
# This handler catches unexpected backend errors and returns a safe message.
# In development it can also expose the error type for debugging.
# ---------------------------------------------------------------------

@app.exception_handler(Exception)
async def readable_server_error_handler(request: Request, exc: Exception):
    """
    Handles unexpected server errors.
    In development, it also shows the error type to help you debug.
    """

    detail = {
        "code": "SERVER_ERROR",
        "message": ERROR_MESSAGES["SERVER_ERROR"],
    }

    if settings.ENV == "dev":
        detail["debug"] = type(exc).__name__

    return JSONResponse(
        status_code=500,
        content={"detail": detail},
    )

# Rate limiter
limiter = Limiter(key_func=get_remote_address)
app.state.limiter = limiter

# Session middleware is needed for Google OAuth.
# Authlib stores temporary OAuth state in request.session.
app.add_middleware(
    SessionMiddleware,
    secret_key=settings.SESSION_SECRET_KEY,
    same_site="lax",
    https_only=False,
)

# CORS: allow the Next.js frontend to call FastAPI.
origins = [o.strip() for o in settings.CORS_ORIGINS.split(",") if o.strip()]

# Routers
app.include_router(quizzes_router)
app.include_router(notes_router)
app.include_router(ai_router)
app.include_router(chat_sessions_router)
app.include_router(progress_router)

# Profile avatar uploads.
UPLOAD_DIR = Path("uploads/avatars")
UPLOAD_DIR.mkdir(parents=True, exist_ok=True)

app.mount("/uploads", StaticFiles(directory="uploads"), name="uploads")

app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:3000",
        "http://127.0.0.1:3000",
    ],
    allow_origin_regex=r"^http://192\.168\.1\.\d+:3000$",
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
    
   
)

# ---------------------------------------------------------------------
# Health Check Route
# ---------------------------------------------------------------------
# This route confirms the backend is running.
# Hosting services can call it to check that the web service is alive.
# ---------------------------------------------------------------------

@app.get("/")
def health():
    return {"status": "ok"}

# ---------------------------------------------------------------------
# Short Error Wrapper
# ---------------------------------------------------------------------
# This small wrapper raises shared API errors with less repeated code.
# It is used by authentication helpers in this file.
# ---------------------------------------------------------------------

def err(code: str, http_status: int):
    api_error(code, http_status)

bearer = HTTPBearer(auto_error=False)

# ---------------------------------------------------------------------
# Current User Lookup
# ---------------------------------------------------------------------
# This function validates the signed-in user and loads their account.
# Protected routes depend on it to keep private data account-specific.
# ---------------------------------------------------------------------

def get_current_user(
    request: Request,
    creds: HTTPAuthorizationCredentials = Depends(bearer),
    db: Session = Depends(get_db),
) -> User:
    token = None

    # Prefer Authorization header (Swagger) if present
    if creds is not None:
        token = creds.credentials

    # Otherwise fallback to cookie (frontend)
    if token is None:
        token = request.cookies.get(settings.AUTH_COOKIE_ACCESS)

    if not token:
        err("AUTH_MISSING_TOKEN", status.HTTP_401_UNAUTHORIZED)

    try:
        payload = decode_and_validate(token, settings.SECRET_KEY, expected_type="access")
        user_id = int(payload["sub"])
    except Exception:
        err("AUTH_INVALID_TOKEN", status.HTTP_401_UNAUTHORIZED)

    user = db.get(User, user_id)
    if not user:
        err("AUTH_USER_NOT_FOUND", status.HTTP_401_UNAUTHORIZED)

    return user

# ---------------------------------------------------------------------
# Authentication Cookie Writer
# ---------------------------------------------------------------------
# This helper stores access and refresh tokens in httpOnly cookies.
# It keeps cookie settings consistent after sign-in, refresh, and Google login.
# ---------------------------------------------------------------------

def set_auth_cookies(res: Response, access_token: str, refresh_token: str):
    # Access cookie: sent to all routes
    res.set_cookie(
        key=settings.AUTH_COOKIE_ACCESS,
        value=access_token,
        httponly=True,
        samesite=settings.AUTH_COOKIE_SAMESITE,
        secure=settings.AUTH_COOKIE_SECURE,
        max_age=60 * settings.ACCESS_TOKEN_EXPIRE_MINUTES,
        path="/",
    )

    # Refresh cookie: only sent to /auth routes (good practice)
    res.set_cookie(
        key=settings.AUTH_COOKIE_REFRESH,
        value=refresh_token,
        httponly=True,
        samesite=settings.AUTH_COOKIE_SAMESITE,
        secure=settings.AUTH_COOKIE_SECURE,
        max_age=60 * 60 * 24 * settings.REFRESH_TOKEN_EXPIRE_DAYS,
        path="/auth",
    )

# ---------------------------------------------------------------------
# Authentication Cookie Clearer
# ---------------------------------------------------------------------
# This helper removes authentication cookies during sign-out or account deletion.
# It uses the same cookie paths as the setter so deletion works correctly.
# ---------------------------------------------------------------------

def clear_auth_cookies(res: Response):
    # Must delete with the SAME path you used when setting
    res.delete_cookie(settings.AUTH_COOKIE_ACCESS, path="/")
    res.delete_cookie(settings.AUTH_COOKIE_REFRESH, path="/auth")

# ---------------------------------------------------------------------
# Refresh Token Revocation
# ---------------------------------------------------------------------
# This helper revokes all active refresh tokens for a user.
# It supports sign-out-all, password reset, and secure account deletion.
# ---------------------------------------------------------------------

def revoke_all_refresh_tokens(db: Session, user_id: int, now: datetime):
    db.execute(
        update(RefreshToken)
        .where(RefreshToken.user_id == user_id, RefreshToken.revoked_at.is_(None))
        .values(revoked_at=now)
    )

# ---------------------------------------------------------------------
# Signup Route
# ---------------------------------------------------------------------
# This route creates a new email/password account and sends a verification code.
# It also resends the code when an unverified account already exists.
# ---------------------------------------------------------------------

@app.post("/auth/signup", response_model=OkOut)
@limiter.limit("5/minute")
def signup(payload: SignUpIn, request: Request, background_tasks: BackgroundTasks, db: Session = Depends(get_db)):
    email = payload.email.strip().lower()

    existing = db.scalar(select(User).where(User.email == email))
    if existing:
        if existing.is_verified:
            raise HTTPException(status_code=409, detail={"code": "AUTH_EMAIL_IN_USE"})

        # If NOT verified → resend code instead of blocking
        code = generate_6_digit_code()
        existing.verify_code_hash = hash_verify_code(existing.email, code, settings.SECRET_KEY)
        existing.verify_code_expires_at = expires_in_minutes(settings.VERIFY_CODE_EXPIRE_MINUTES)
        existing.verify_attempts = 0
        db.commit()

        background_tasks.add_task(send_verification_email, existing.email, code)
        return OkOut()


    pw = payload.password
    if len(pw) < 8:
        raise HTTPException(400, detail={"code": "AUTH_PASSWORD_TOO_SHORT"})
    if pw.lower() == pw or pw.upper() == pw:
        raise HTTPException(400, detail={"code": "AUTH_PASSWORD_NEEDS_MIXED_CASE"})
    if not any(c.isdigit() for c in pw):
        raise HTTPException(400, detail={"code": "AUTH_PASSWORD_NEEDS_NUMBER"})
    if not any(not c.isalnum() for c in pw):
        raise HTTPException(400, detail={"code": "AUTH_PASSWORD_NEEDS_SYMBOL"})

    try:
        pw_hash = hash_password(pw)
    except ValueError as e:
        if str(e) == "PASSWORD_TOO_LONG_BCRYPT_72_BYTES":
            raise HTTPException(400, detail={"code": "AUTH_PASSWORD_TOO_LONG"})
        raise

    user = User(email=email, first_name=payload.first_name, surname=payload.surname, password_hash=pw_hash)

    code = generate_6_digit_code()
    user.verify_code_hash = hash_verify_code(user.email, code, settings.SECRET_KEY)
    user.verify_code_expires_at = expires_in_minutes(settings.VERIFY_CODE_EXPIRE_MINUTES)
    user.verify_attempts = 0
    user.is_verified = False

    db.add(user)
    db.commit()
    db.refresh(user)

    # ✅ non-blocking email send
    background_tasks.add_task(send_verification_email, user.email, code)
    return OkOut()

# ---------------------------------------------------------------------
# Email Verification Route
# ---------------------------------------------------------------------
# This route checks the six-digit verification code and marks the account as verified.
# It also protects the flow with expiry and attempt limits.
# ---------------------------------------------------------------------

@app.post("/auth/verify", response_model=OkOut)
@limiter.limit("10/minute")
def verify_email(payload: VerifyEmail, request: Request, db: Session = Depends(get_db)):
    email = payload.email.strip().lower()

    user = db.scalar(select(User).where(User.email == email))
    if not user:
        raise HTTPException(404, detail={"code": "AUTH_USER_NOT_FOUND"})

    if user.is_verified:
        return OkOut()

    if not user.verify_code_hash or not user.verify_code_expires_at:
        raise HTTPException(400, detail={"code": "AUTH_NO_VERIFY_CODE"})

    if datetime.utcnow() > user.verify_code_expires_at:
        raise HTTPException(400, detail={"code": "AUTH_VERIFY_CODE_EXPIRED"})

    if user.verify_attempts >= 10:
        raise HTTPException(429, detail={"code": "AUTH_TOO_MANY_ATTEMPTS"})

    if not verify_code_matches(email, payload.code, settings.SECRET_KEY, user.verify_code_hash):
        user.verify_attempts += 1
        db.commit()
        raise HTTPException(400, detail={"code": "AUTH_VERIFY_CODE_INVALID"})

    user.is_verified = True
    user.verify_code_hash = None
    user.verify_code_expires_at = None
    user.verify_attempts = 0
    db.commit()

    return OkOut()

# ---------------------------------------------------------------------
# Resend Verification Route
# ---------------------------------------------------------------------
# This route generates a fresh verification code for unverified accounts.
# It avoids leaking whether an email exists when no matching account is found.
# ---------------------------------------------------------------------

@app.post("/auth/resend-verification", response_model=OkOut)
@limiter.limit("4/minute")
def resend_verification(payload: ResendVerify, request: Request, background_tasks: BackgroundTasks, db: Session = Depends(get_db)):
    email = payload.email.strip().lower()

    user = db.scalar(select(User).where(User.email == email))
    if not user:
        return OkOut()  # don't leak whether email exists

    if user.is_verified:
        return OkOut()

    code = generate_6_digit_code()
    user.verify_code_hash = hash_verify_code(email, code, settings.SECRET_KEY)
    user.verify_code_expires_at = expires_in_minutes(settings.VERIFY_CODE_EXPIRE_MINUTES)
    user.verify_attempts = 0
    db.commit()

    background_tasks.add_task(send_verification_email, email, code)
    return OkOut()

# ---------------------------------------------------------------------
# Email Sign-in Route
# ---------------------------------------------------------------------
# This route checks email/password credentials and creates login cookies.
# It also handles verification checks, failed attempts, and temporary lockout.
# ---------------------------------------------------------------------

@app.post("/auth/signin", response_model=UserOut)
@limiter.limit("10/minute")
def signin(payload: SignInIn, request: Request, res: Response, db: Session = Depends(get_db)):
    """
    Signs a user in.
    - If email does not exist: returns AUTH_USER_NOT_FOUND (404) so frontend can show "Create account".
    - If password is wrong: returns AUTH_INVALID_CREDENTIALS (401).
    - If email not verified: returns AUTH_EMAIL_NOT_VERIFIED (403).
    - If locked out: returns AUTH_LOCKED_TRY_LATER (429).
    - On success: sets httpOnly access + refresh cookies and returns user info.
    """

    # Normalize email the same way as signup (trim + lowercase)
    email = payload.email.strip().lower()

    # Look up user by email
    user = db.scalar(select(User).where(User.email == email))

    # ✅ If the email doesn't exist, return a distinct code
    # NOTE: This reveals whether the email exists (by design, per your UX requirement).
    if not user:
        raise HTTPException(status_code=404, detail={"code": "AUTH_USER_NOT_FOUND"})

    # ✅ If user is locked out due to too many failed attempts
    if user.lockout_until and datetime.utcnow() < user.lockout_until:
        raise HTTPException(status_code=429, detail={"code": "AUTH_LOCKED_TRY_LATER"})

    # ✅ Check password
    if not verify_password(payload.password, user.password_hash):
        # Increase failed attempts
        user.failed_login_attempts += 1

        # Lock account for 10 minutes after 5 failed attempts
        if user.failed_login_attempts >= 5:
            user.lockout_until = datetime.utcnow() + timedelta(minutes=10)
            user.failed_login_attempts = 0

        db.commit()

        # Wrong password (or wrong credentials)
        raise HTTPException(status_code=401, detail={"code": "AUTH_INVALID_CREDENTIALS"})

    # ✅ Require email verification
    if not user.is_verified:
        raise HTTPException(status_code=403, detail={"code": "AUTH_EMAIL_NOT_VERIFIED"})

    now = datetime.utcnow()

    # ✅ Success: reset counters
    user.failed_login_attempts = 0
    user.lockout_until = None

    # Cleanup expired refresh tokens
    db.execute(
        delete(RefreshToken).where(
            RefreshToken.user_id == user.id,
            RefreshToken.expires_at < now,
        )
    )

    # Create a new access token for this session/device
    access_token = create_access_token(
        subject=str(user.id),
        secret_key=settings.SECRET_KEY,
        expires_minutes=settings.ACCESS_TOKEN_EXPIRE_MINUTES,
    )

    # Create a new refresh token for this session/device
    refresh_token, refresh_jti, refresh_exp = create_refresh_token(
        subject=str(user.id),
        secret_key=settings.SECRET_KEY,
        expires_days=settings.REFRESH_TOKEN_EXPIRE_DAYS,
    )

    # Store refresh token in DB (for rotation / revocation)
    db.add(RefreshToken(jti=refresh_jti, user_id=user.id, expires_at=refresh_exp))

    db.commit()

    # ✅ Set httpOnly cookies (frontend must use fetch with credentials: "include")
    set_auth_cookies(res, access_token, refresh_token)

    # Return basic user info
    return UserOut(
        id=user.id,
        email=user.email,
        first_name=user.first_name,
        surname=user.surname,
        display_name=user.display_name,
        avatar_url=user.avatar_url,
    )


# ---------------------------------------------------------------------
# Google Login Start Route
# ---------------------------------------------------------------------
# This route starts the Google OAuth flow.
# It redirects the user to Google so they can choose an account securely.
# ---------------------------------------------------------------------

@app.get("/auth/google/login")
async def google_login(request: Request):
    """
    Starts the Google login flow.

    Frontend calls:
      /api/backend/auth/google/login

    Proxy forwards to:
      /auth/google/login
    """

    if not settings.GOOGLE_CLIENT_ID or not settings.GOOGLE_CLIENT_SECRET:
        raise HTTPException(
            status_code=500,
            detail={"code": "GOOGLE_AUTH_NOT_CONFIGURED"},
        )

    return await oauth.google.authorize_redirect(
        request,
        settings.GOOGLE_REDIRECT_URI,
    )


# ---------------------------------------------------------------------
# Google Login Callback Route
# ---------------------------------------------------------------------
# This route handles the response from Google after account selection.
# It creates or links the user account, then signs the user into MediMind.
# ---------------------------------------------------------------------

@app.get("/auth/google/callback")
async def google_callback(
    request: Request,
    res: Response,
    db: Session = Depends(get_db),
):
    """
    Handles Google's response after the user chooses their Google account.

    If the user does not exist, create them.
    If they already exist, sign them in.
    """

    try:
        token = await oauth.google.authorize_access_token(request)
    except Exception as exc:
            print("GOOGLE_AUTH_REAL_ERROR:", repr(exc), flush=True)
            raise HTTPException(
                status_code=400,
                detail={
                    "code": "GOOGLE_AUTH_FAILED",
                    "message": "Google sign-in could not be completed. Please try again.",
                },
            )

    user_info = token.get("userinfo")

    if not user_info:
        try:
            user_info = await oauth.google.userinfo(token=token)
        except Exception:
            raise HTTPException(
                status_code=400,
                detail={"code": "GOOGLE_USERINFO_FAILED"},
            )

    google_sub = user_info.get("sub")
    email = user_info.get("email")
    first_name = user_info.get("given_name")
    surname = user_info.get("family_name")
    display_name = user_info.get("name")
    avatar_url = user_info.get("picture")

    if not google_sub or not email:
        raise HTTPException(
            status_code=400,
            detail={"code": "GOOGLE_MISSING_ACCOUNT_INFO"},
        )

    email = email.strip().lower()
    now = datetime.utcnow()

    # First try to find user by Google ID.
    user = db.scalar(select(User).where(User.google_sub == google_sub))

    # If not found by Google ID, try email.
    # This allows linking Google login to an existing account with the same email.
    if not user:
        user = db.scalar(select(User).where(User.email == email))

    if not user:
        # Google users do not need a real password, but your User table requires password_hash.
        # So we store a random unusable password hash.
        random_password = uuid.uuid4().hex + uuid.uuid4().hex
        password_hash = hash_password(random_password[:32] + "A1!")

        user = User(
            email=email,
            password_hash=password_hash,
            first_name=first_name,
            surname=surname,
            display_name=display_name,
            avatar_url=avatar_url,
            is_verified=True,
            auth_provider="google",
            google_sub=google_sub,
        )

        db.add(user)
        db.commit()
        db.refresh(user)
    else:
        # Update/link Google details on existing user.
        user.google_sub = user.google_sub or google_sub
        user.auth_provider = "google"
        user.is_verified = True

        if not user.first_name and first_name:
            user.first_name = first_name

        if not user.surname and surname:
            user.surname = surname

        if not user.display_name and display_name:
            user.display_name = display_name

        if not user.avatar_url and avatar_url:
            user.avatar_url = avatar_url

        db.commit()
        db.refresh(user)

    # Clean expired refresh tokens.
    db.execute(
        delete(RefreshToken).where(
            RefreshToken.user_id == user.id,
            RefreshToken.expires_at < now,
        )
    )

    # Create normal MediMind access token.
    access_token = create_access_token(
        subject=str(user.id),
        secret_key=settings.SECRET_KEY,
        expires_minutes=settings.ACCESS_TOKEN_EXPIRE_MINUTES,
    )

    # Create normal MediMind refresh token.
    refresh_token, refresh_jti, refresh_exp = create_refresh_token(
        subject=str(user.id),
        secret_key=settings.SECRET_KEY,
        expires_days=settings.REFRESH_TOKEN_EXPIRE_DAYS,
    )

    db.add(
        RefreshToken(
            jti=refresh_jti,
            user_id=user.id,
            expires_at=refresh_exp,
        )
    )

    db.commit()

    redirect_response = RedirectResponse(
        url=f"{settings.FRONTEND_URL}/dashboard",
        status_code=302,
    )

    set_auth_cookies(redirect_response, access_token, refresh_token)

    return redirect_response

# ---------------------------------------------------------------------
# Session Refresh Route
# ---------------------------------------------------------------------
# This route rotates refresh tokens and creates a new access token.
# It helps keep sessions active while detecting unsafe refresh-token reuse.
# ---------------------------------------------------------------------

@app.post("/auth/refresh", response_model=OkOut)
@limiter.limit("30/minute")
def refresh(request: Request, res: Response, db: Session = Depends(get_db)):
    token = request.cookies.get(settings.AUTH_COOKIE_REFRESH)
    if not token:
        raise HTTPException(401, detail={"code": "AUTH_MISSING_REFRESH"})

    try:
        payload = decode_and_validate(token, settings.SECRET_KEY, expected_type="refresh")
        user_id = int(payload["sub"])
        jti = payload["jti"]
    except Exception:
        raise HTTPException(401, detail={"code": "AUTH_INVALID_REFRESH"})

    rt = db.scalar(select(RefreshToken).where(RefreshToken.jti == jti))

    if rt and rt.revoked_at is not None:
        now = datetime.utcnow()
        revoke_all_refresh_tokens(db, rt.user_id, now)
        db.commit()
        clear_auth_cookies(res)
        raise HTTPException(401, detail={"code": "AUTH_REFRESH_REUSE_DETECTED"})

    if not rt:
        raise HTTPException(401, detail={"code": "AUTH_REFRESH_REVOKED"})

    if rt.user_id != user_id:
        raise HTTPException(401, detail={"code": "AUTH_INVALID_REFRESH"})

    if datetime.utcnow() > rt.expires_at:
        raise HTTPException(401, detail={"code": "AUTH_REFRESH_EXPIRED"})

    user = db.get(User, user_id)
    if not user:
        raise HTTPException(401, detail={"code": "AUTH_USER_NOT_FOUND"})

    # ✅ mint a NEW access token as well
    new_access_token = create_access_token(
        subject=str(user.id),
        secret_key=settings.SECRET_KEY,
        expires_minutes=settings.ACCESS_TOKEN_EXPIRE_MINUTES,
    )

    # ✅ rotate refresh token
    new_refresh_token, new_jti, new_exp = create_refresh_token(
        subject=str(user.id),
        secret_key=settings.SECRET_KEY,
        expires_days=settings.REFRESH_TOKEN_EXPIRE_DAYS,
    )

    rt.revoked_at = datetime.utcnow()
    rt.replaced_by_jti = new_jti
    db.add(RefreshToken(jti=new_jti, user_id=user.id, expires_at=new_exp))
    db.commit()

    # ✅ now set BOTH cookies correctly
    set_auth_cookies(res, new_access_token, new_refresh_token)
    return OkOut()


# ---------------------------------------------------------------------
# Single Device Sign-out Route
# ---------------------------------------------------------------------
# This route revokes the current refresh token and clears auth cookies.
# It signs the user out from the current browser session only.
# ---------------------------------------------------------------------

@app.post("/auth/signout", response_model=OkOut)
def signout(request: Request, res: Response, db: Session = Depends(get_db)):
    token = request.cookies.get(settings.AUTH_COOKIE_REFRESH)
    if token:
        try:
            payload = decode_and_validate(token, settings.SECRET_KEY, expected_type="refresh")
            jti = payload["jti"]
            rt = db.scalar(select(RefreshToken).where(RefreshToken.jti == jti))
            if rt and rt.revoked_at is None:
                rt.revoked_at = datetime.utcnow()
                db.commit()
        except Exception:
            pass

    clear_auth_cookies(res)
    return OkOut()

# ✅ premium: sign out of all devices (revokes ALL refresh tokens)
# ---------------------------------------------------------------------
# All Devices Sign-out Route
# ---------------------------------------------------------------------
# This route revokes every refresh token for the current user.
# It is used when the user wants to end all active sessions.
# ---------------------------------------------------------------------

@app.post("/auth/signout-all", response_model=OkOut)
def signout_all(
    request: Request,
    res: Response,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    now = datetime.utcnow()
    revoke_all_refresh_tokens(db, current_user.id, now)
    db.commit()
    clear_auth_cookies(res)
    return OkOut()


# ---------------------------------------------------------------------
# Forgot Password Route
# ---------------------------------------------------------------------
# This route creates a reset code and sends it to the user email.
# It returns a neutral success response so account existence is not leaked.
# ---------------------------------------------------------------------

@app.post("/auth/forgot-password", response_model=OkOut)
@limiter.limit("4/minute")
def forgot_password(
    payload: ForgotPasswordIn,
    request: Request,
    background_tasks: BackgroundTasks,
    db: Session = Depends(get_db),
):
    email = payload.email.strip().lower()

    user = db.scalar(select(User).where(User.email == email))

    # Do not reveal whether the email exists.
    if not user:
        return OkOut()

    code = generate_6_digit_code()

    user.reset_code_hash = hash_verify_code(email, code, settings.SECRET_KEY)
    user.reset_code_expires_at = expires_in_minutes(15)
    user.reset_attempts = 0

    db.commit()

    background_tasks.add_task(send_verification_email, email, code)

    return OkOut()


# ---------------------------------------------------------------------
# Reset Code Verification Route
# ---------------------------------------------------------------------
# This route checks whether a password-reset code is valid and not expired.
# It lets the frontend confirm the code before accepting a new password.
# ---------------------------------------------------------------------

@app.post("/auth/verify-reset-code", response_model=OkOut)
@limiter.limit("10/minute")
def verify_reset_code(
    payload: VerifyResetCodeIn,
    request: Request,
    db: Session = Depends(get_db),
):
    email = payload.email.strip().lower()

    user = db.scalar(select(User).where(User.email == email))

    if not user:
        raise HTTPException(status_code=400, detail={"code": "RESET_CODE_INVALID"})

    if not user.reset_code_hash or not user.reset_code_expires_at:
        raise HTTPException(status_code=400, detail={"code": "RESET_CODE_MISSING"})

    if datetime.utcnow() > user.reset_code_expires_at:
        raise HTTPException(status_code=400, detail={"code": "RESET_CODE_EXPIRED"})

    if user.reset_attempts >= 10:
        raise HTTPException(status_code=429, detail={"code": "RESET_TOO_MANY_ATTEMPTS"})

    if not verify_code_matches(email, payload.code, settings.SECRET_KEY, user.reset_code_hash):
        user.reset_attempts += 1
        db.commit()
        raise HTTPException(status_code=400, detail={"code": "RESET_CODE_INVALID"})

    return OkOut()


# ---------------------------------------------------------------------
# Reset Password Route
# ---------------------------------------------------------------------
# This route validates the reset code and saves the new password hash.
# It clears reset data and revokes active sessions after the password changes.
# ---------------------------------------------------------------------

@app.post("/auth/reset-password", response_model=OkOut)
@limiter.limit("6/minute")
def reset_password(
    payload: ResetPasswordIn,
    request: Request,
    db: Session = Depends(get_db),
):
    email = payload.email.strip().lower()

    user = db.scalar(select(User).where(User.email == email))

    if not user:
        raise HTTPException(status_code=400, detail={"code": "RESET_CODE_INVALID"})

    if not user.reset_code_hash or not user.reset_code_expires_at:
        raise HTTPException(status_code=400, detail={"code": "RESET_CODE_MISSING"})

    if datetime.utcnow() > user.reset_code_expires_at:
        raise HTTPException(status_code=400, detail={"code": "RESET_CODE_EXPIRED"})

    if user.reset_attempts >= 10:
        raise HTTPException(status_code=429, detail={"code": "RESET_TOO_MANY_ATTEMPTS"})

    if not verify_code_matches(email, payload.code, settings.SECRET_KEY, user.reset_code_hash):
        user.reset_attempts += 1
        db.commit()
        raise HTTPException(status_code=400, detail={"code": "RESET_CODE_INVALID"})

    new_password = payload.new_password

    if len(new_password) < 8:
        raise HTTPException(400, detail={"code": "AUTH_PASSWORD_TOO_SHORT"})

    if new_password.lower() == new_password or new_password.upper() == new_password:
        raise HTTPException(400, detail={"code": "AUTH_PASSWORD_NEEDS_MIXED_CASE"})

    if not any(c.isdigit() for c in new_password):
        raise HTTPException(400, detail={"code": "AUTH_PASSWORD_NEEDS_NUMBER"})

    if not any(not c.isalnum() for c in new_password):
        raise HTTPException(400, detail={"code": "AUTH_PASSWORD_NEEDS_SYMBOL"})
    
    # Do not allow the user to reuse their current password
    if verify_password(payload.new_password, user.password_hash):
        raise HTTPException(
            status_code=400,
            detail={"code": "AUTH_PASSWORD_SAME_AS_OLD"},
        )

    user.password_hash = hash_password(new_password)

    user.reset_code_hash = None
    user.reset_code_expires_at = None
    user.reset_attempts = 0
    user.failed_login_attempts = 0
    user.lockout_until = None

    revoke_all_refresh_tokens(db, user.id, datetime.utcnow())

    db.commit()

    return OkOut()

# ---------------------------------------------------------------------
# Current Profile Route
# ---------------------------------------------------------------------
# This route returns profile details for the signed-in user.
# It is used by Settings and account display areas in the frontend.
# ---------------------------------------------------------------------

@app.get("/auth/me", response_model=UserOut)
def me(current_user: User = Depends(get_current_user)):
    """
    Returns the currently logged-in user.

    Used by:
    - Settings page profile
    - Sidebar account menu
    """

    return UserOut(
        id=current_user.id,
        email=current_user.email,
        first_name=current_user.first_name,
        surname=current_user.surname,
        display_name=current_user.display_name,
        avatar_url=current_user.avatar_url,
    )


# ---------------------------------------------------------------------
# Basic Profile Update Route
# ---------------------------------------------------------------------
# This route updates editable profile fields for the signed-in user.
# It keeps names and display names in sync with the database.
# ---------------------------------------------------------------------

@app.patch("/auth/me", response_model=UserOut)
def update_me(
    payload: UserProfileUpdateIn,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    if payload.first_name is not None:
        current_user.first_name = payload.first_name.strip() or None

    if payload.surname is not None:
        current_user.surname = payload.surname.strip() or None

    if payload.display_name is not None:
        current_user.display_name = payload.display_name.strip() or None

    db.commit()
    db.refresh(current_user)

    return UserOut(
        id=current_user.id,
        email=current_user.email,
        first_name=current_user.first_name,
        surname=current_user.surname,
        display_name=current_user.display_name,
        avatar_url=current_user.avatar_url,
    )


# ---------------------------------------------------------------------
# Change Password Route
# ---------------------------------------------------------------------
# This route verifies the current password and saves a new password hash.
# It applies the same password rules used during signup.
# ---------------------------------------------------------------------

@app.post("/auth/change-password", response_model=OkOut)
def change_password(
    payload: ChangePasswordIn,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """
    Changes the logged-in user's password.

    The current password must be correct.
    The new password uses the same rules as signup.
    """

    if not verify_password(payload.current_password, current_user.password_hash):
        raise HTTPException(
            status_code=400,
            detail={"code": "AUTH_CURRENT_PASSWORD_INCORRECT"},
        )

    new_password = payload.new_password

    if len(new_password) < 8:
        raise HTTPException(400, detail={"code": "AUTH_PASSWORD_TOO_SHORT"})

    if new_password.lower() == new_password or new_password.upper() == new_password:
        raise HTTPException(400, detail={"code": "AUTH_PASSWORD_NEEDS_MIXED_CASE"})

    if not any(c.isdigit() for c in new_password):
        raise HTTPException(400, detail={"code": "AUTH_PASSWORD_NEEDS_NUMBER"})

    if not any(not c.isalnum() for c in new_password):
        raise HTTPException(400, detail={"code": "AUTH_PASSWORD_NEEDS_SYMBOL"})

    try:
        current_user.password_hash = hash_password(new_password)
    except ValueError as e:
        if str(e) == "PASSWORD_TOO_LONG_BCRYPT_72_BYTES":
            raise HTTPException(400, detail={"code": "AUTH_PASSWORD_TOO_LONG"})
        raise

    db.commit()

    return OkOut()



# ---------------------------------------------------------------------
# Extended Profile Update Route
# ---------------------------------------------------------------------
# This route updates profile fields including username when available.
# It checks username uniqueness before saving changes.
# ---------------------------------------------------------------------

@app.patch("/auth/profile", response_model=UserOut)
def update_profile(
    payload: UserProfileUpdateIn,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """
    Updates editable profile fields.
    The user can update one field or many fields at once.
    """

    if payload.username is not None:
        username = payload.username.strip()

        if username:
            existing = db.scalar(
                select(User).where(
                    User.username == username,
                    User.id != current_user.id,
                )
            )

            if existing:
                raise HTTPException(
                    status_code=409,
                    detail={"code": "USERNAME_ALREADY_TAKEN"},
                )

            current_user.username = username
        else:
            current_user.username = None

    if payload.first_name is not None:
        current_user.first_name = payload.first_name.strip() or None

    if payload.surname is not None:
        current_user.surname = payload.surname.strip() or None

    if payload.display_name is not None:
        current_user.display_name = payload.display_name.strip() or None

    db.commit()
    db.refresh(current_user)

    return UserOut(
        id=current_user.id,
        email=current_user.email,
        first_name=current_user.first_name,
        surname=current_user.surname,
        username=current_user.username,
        display_name=current_user.display_name,
        avatar_url=current_user.avatar_url,
    )

# ---------------------------------------------------------------------
# Avatar Upload Route
# ---------------------------------------------------------------------
# This route validates and uploads a profile picture to Supabase Storage.
# It saves the public avatar URL back onto the user account.
# ---------------------------------------------------------------------

@app.post("/auth/avatar", response_model=UserOut)
async def upload_avatar(
    avatar: UploadFile = File(...),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    allowed_types = {
        "image/jpeg": ".jpg",
        "image/png": ".png",
        "image/webp": ".webp",
    }

    if avatar.content_type not in allowed_types:
        raise HTTPException(
            status_code=400,
            detail={
                "code": "AVATAR_INVALID_FILE_TYPE",
                "message": "Please upload a JPG, PNG, or WebP image.",
            },
        )

    contents = await avatar.read()

    if len(contents) > 2 * 1024 * 1024:
        raise HTTPException(
            status_code=400,
            detail={
                "code": "AVATAR_FILE_TOO_LARGE",
                "message": "Please upload an image smaller than 2 MB.",
            },
        )

    if not settings.SUPABASE_URL or not settings.SUPABASE_SERVICE_ROLE_KEY:
        raise HTTPException(
            status_code=500,
            detail={
                "code": "AVATAR_STORAGE_NOT_CONFIGURED",
                "message": "Avatar storage is not configured on the backend.",
            },
        )

    extension = allowed_types[avatar.content_type]
    filename = f"user-{current_user.id}-{uuid.uuid4().hex}{extension}"
    storage_path = f"avatars/{filename}"

    supabase = create_client(
        settings.SUPABASE_URL,
        settings.SUPABASE_SERVICE_ROLE_KEY,
    )

    supabase.storage.from_(settings.SUPABASE_AVATAR_BUCKET).upload(
        path=storage_path,
        file=contents,
        file_options={
            "content-type": avatar.content_type,
            "upsert": "true",
        },
    )

    public_url = supabase.storage.from_(
        settings.SUPABASE_AVATAR_BUCKET
    ).get_public_url(storage_path)

    current_user.avatar_url = public_url

    db.commit()
    db.refresh(current_user)

    return current_user

# ---------------------------------------------------------------------
# Delete Account Route
# ---------------------------------------------------------------------
# This route permanently deletes the signed-in user and related learning data.
# It requires DELETE confirmation and checks passwords for local accounts.
# ---------------------------------------------------------------------

@app.delete("/auth/me", response_model=OkOut)
def delete_my_account(
    payload: DeleteAccountIn,
    res: Response,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """
    Permanently deletes the logged-in user's account and learning data.

    For normal email/password accounts:
    - current password is required.

    For Google accounts:
    - password is not required because the user may not have a MediMind password.
    - typing DELETE is still required.
    """

    if payload.confirm_text.strip() != "DELETE":
        raise HTTPException(
            status_code=400,
            detail={"code": "AUTH_DELETE_CONFIRM_REQUIRED"},
        )

    is_google_account = current_user.auth_provider == "google"

    if not is_google_account:
        if not payload.current_password:
            raise HTTPException(
                status_code=400,
                detail={"code": "AUTH_DELETE_PASSWORD_REQUIRED"},
            )

        if not verify_password(payload.current_password, current_user.password_hash):
            raise HTTPException(
                status_code=400,
                detail={"code": "AUTH_DELETE_PASSWORD_INCORRECT"},
            )

    # Delete quiz attempts first so related quiz questions are removed cleanly.
    quiz_attempts = (
        db.query(models.QuizAttempt)
        .filter(models.QuizAttempt.user_id == current_user.id)
        .all()
    )

    for attempt in quiz_attempts:
        db.delete(attempt)

    # Revoke refresh tokens before deleting the user.
    revoke_all_refresh_tokens(db, current_user.id, datetime.utcnow())

    # Delete the user.
    # User relationships should remove notes, chat sessions, chat messages,
    # and refresh tokens through cascade rules.
    db.delete(current_user)
    db.commit()

    clear_auth_cookies(res)

    return OkOut()


# ---------------------------------------------------------------------
# Protected Test Route
# ---------------------------------------------------------------------
# This route confirms that authentication is working.
# It only returns success when get_current_user validates the session.
# ---------------------------------------------------------------------

@app.get("/protected", response_model=OkOut)
def protected_route(current_user: User = Depends(get_current_user)):
    return OkOut()

print("ENV LOADED:", settings.ENV)
print("CORS_ORIGINS:", settings.CORS_ORIGINS)