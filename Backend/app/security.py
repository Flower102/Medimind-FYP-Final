from datetime import datetime, timedelta, timezone
import uuid
from jose import jwt, JWTError
from passlib.context import CryptContext
import hashlib
import secrets
from .settings import settings


# ---------------------------------------------------------------------
# Password Hashing Setup
# ---------------------------------------------------------------------
# This section configures bcrypt password hashing through Passlib.
# It is used when creating, changing, and checking account passwords.
# ---------------------------------------------------------------------
pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")

# 30 days (you can change later)
ACCESS_TOKEN_EXPIRE_DAYS = 30
ALGORITHM = "HS256"


# ---------------------------------------------------------------------
# Time Helper Functions
# ---------------------------------------------------------------------
# These helpers create timezone-safe timestamps for token creation and expiry.
# They keep time handling consistent across authentication functions.
# ---------------------------------------------------------------------
def _utcnow() -> datetime:
    return datetime.now(timezone.utc)

def _to_timestamp(dt: datetime) -> int:
    return int(dt.timestamp())


# ---------------------------------------------------------------------
# Password Validation and Hashing
# ---------------------------------------------------------------------
# This section hashes passwords and checks entered passwords against stored hashes.
# The bcrypt byte-limit handling prevents long passwords from being silently truncated.
# ---------------------------------------------------------------------
def ensure_bcrypt_password_ok(password: str) -> None:
    # bcrypt uses only first 72 BYTES (not chars)
    if len(password.encode("utf-8")) > 72:
        raise ValueError("PASSWORD_TOO_LONG_BCRYPT_72_BYTES")


def hash_password(password: str) -> str:
    try:
        return pwd_context.hash(password)
    except ValueError as e:
        msg = str(e)
        # bcrypt 72-byte limit error message
        if "password cannot be longer than 72 bytes" in msg:
            raise ValueError("PASSWORD_TOO_LONG_BCRYPT_72_BYTES")
        raise

def verify_password(password: str, password_hash: str) -> bool:
    return pwd_context.verify(password, password_hash)


# ---------------------------------------------------------------------
# JWT Creation and Validation
# ---------------------------------------------------------------------
# This section creates access and refresh tokens for logged-in sessions.
# Token validation checks the token type and required fields before trusting it.
# ---------------------------------------------------------------------
def _create_jwt(subject: str, secret_key: str, expires_delta: timedelta, token_type: str, jti: str) -> str:
    now = datetime.now(timezone.utc)
    exp = now + expires_delta
    payload = {
        "sub": subject,
        "type": token_type,   # "access" or "refresh"
        "jti": jti,           # token id (for rotation / revocation)
        "iat": int(now.timestamp()),
        "exp": int(exp.timestamp()),
    }
    return jwt.encode(payload, secret_key, algorithm=ALGORITHM)


def create_access_token(subject: str, secret_key: str, expires_minutes: int) -> str:
    jti = uuid.uuid4().hex
    return _create_jwt(subject, secret_key, timedelta(minutes=expires_minutes), "access", jti)


def create_refresh_token(subject: str, secret_key: str, expires_days: int) -> tuple[str, str, datetime]:
    jti = uuid.uuid4().hex
    token = _create_jwt(subject, secret_key, timedelta(days=expires_days), "refresh", jti)
    expires_at = datetime.utcnow() + timedelta(days=expires_days)  # naive UTC ok for sqlite
    return token, jti, expires_at


def decode_and_validate(token: str, secret_key: str, expected_type: str) -> dict:
    payload = jwt.decode(token, secret_key, algorithms=[ALGORITHM])
    if payload.get("type") != expected_type:
        raise JWTError("wrong token type")
    if not payload.get("sub"):
        raise JWTError("missing sub")
    if not payload.get("jti"):
        raise JWTError("missing jti")
    return payload


# ---------------------------------------------------------------------
# Verification Code Helpers
# ---------------------------------------------------------------------
# This section creates and checks six-digit verification/reset codes.
# Codes are hashed before storage so the real code is not saved in the database.
# ---------------------------------------------------------------------
def generate_6_digit_code() -> str:
    return f"{secrets.randbelow(1_000_000):06d}"


def hash_verify_code(email: str, code: str, secret: str) -> str:
    raw = f"{email.lower()}:{code}:{secret}".encode("utf-8")
    return hashlib.sha256(raw).hexdigest()


def verify_code_matches(email: str, code: str, secret: str, stored_hash: str) -> bool:
    return hash_verify_code(email, code, secret) == stored_hash


# ---------------------------------------------------------------------
# Expiry Helper
# ---------------------------------------------------------------------
# This helper calculates when verification and reset codes should expire.
# It keeps expiry creation simple in signup and password-reset routes.
# ---------------------------------------------------------------------
def expires_in_minutes(minutes: int) -> datetime:
    return datetime.utcnow() + timedelta(minutes=minutes)
    
