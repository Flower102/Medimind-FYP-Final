# backend/app/deps.py

"""
Shared dependency functions.

This file contains get_current_user(), which protects private backend routes.
It now returns clearer backend error details:
- code: stable machine-readable value for frontend mapping
- message: plain English explanation
- action: suggested next step for the user/developer
"""

# ---------------------------------------------------------------------
# Imports and Shared Dependencies
# ---------------------------------------------------------------------
# This section imports FastAPI security tools, database access, and user models.
# These imports support authentication checks across protected API routes.
# ---------------------------------------------------------------------
from fastapi import Depends, HTTPException, Request, status
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer
from sqlalchemy.orm import Session

from .db import get_db
from .models import User 
from .settings import settings
from .security import decode_and_validate


# ---------------------------------------------------------------------
# Bearer Token Setup
# ---------------------------------------------------------------------
# This section creates an optional bearer-token reader for Swagger and API testing.
# The frontend usually uses cookies, but this also supports Authorization headers.
# ---------------------------------------------------------------------
bearer = HTTPBearer(auto_error=False)


# ---------------------------------------------------------------------
# Shared API Error Helper
# ---------------------------------------------------------------------
# This helper raises backend errors in one consistent shape.
# It lets the frontend show clear messages without guessing what went wrong.
# ---------------------------------------------------------------------
def raise_api_error(status_code: int, code: str, message: str, action: str):
    """
    Raises an API error in a consistent structure.

    Existing frontend code can still read detail.code.
    Newer frontend code can also display detail.message or detail.action.
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
# Current User Dependency
# ---------------------------------------------------------------------
# This dependency validates the user's access token and loads their account.
# Protected routes use it to make sure users only access their own data.
# ---------------------------------------------------------------------
def get_current_user(
    request: Request,
    creds: HTTPAuthorizationCredentials = Depends(bearer),
    db: Session = Depends(get_db),
) -> User:
    """
    Returns the logged-in user.

    Token lookup order:
    1. httpOnly access cookie from the frontend
    2. Authorization header for Swagger/Postman testing
    """

    # Frontend login uses httpOnly cookies.
    token = request.cookies.get(settings.AUTH_COOKIE_ACCESS)

    # Swagger/Postman can use Authorization: Bearer <token>.
    if not token and creds:
        token = creds.credentials

    if not token:
        raise_api_error(
            status.HTTP_401_UNAUTHORIZED,
            "AUTH_MISSING_TOKEN",
            "You are not signed in, or your login session is missing.",
            "Please sign in again and retry the action.",
        )

    try:
        payload = decode_and_validate(
            token,
            settings.SECRET_KEY,
            expected_type="access",
        )
        user_id = int(payload["sub"])
    except Exception:
        raise_api_error(
            status.HTTP_401_UNAUTHORIZED,
            "AUTH_INVALID_TOKEN",
            "Your login session is invalid or has expired.",
            "Please sign in again to get a fresh session.",
        )

    user = db.get(User, user_id)

    if not user:
        raise_api_error(
            status.HTTP_401_UNAUTHORIZED,
            "AUTH_USER_NOT_FOUND",
            "The account linked to this session could not be found.",
            "Please sign out, then sign in again with a valid account.",
        )

    return user 
