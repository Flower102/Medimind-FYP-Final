from datetime import datetime, timedelta, timezone
import uuid
from jose import jwt, JWTError
from passlib.context import CryptContext
import hashlib
import secrets
from .settings import settings

pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")

# 30 days (you can change later)
ACCESS_TOKEN_EXPIRE_DAYS = 30
ALGORITHM = "HS256"

def _utcnow() -> datetime:
    return datetime.now(timezone.utc)

def _to_timestamp(dt: datetime) -> int:
    return int(dt.timestamp())


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


def generate_6_digit_code() -> str:
    return f"{secrets.randbelow(1_000_000):06d}"


def hash_verify_code(email: str, code: str, secret: str) -> str:
    raw = f"{email.lower()}:{code}:{secret}".encode("utf-8")
    return hashlib.sha256(raw).hexdigest()


def verify_code_matches(email: str, code: str, secret: str, stored_hash: str) -> bool:
    return hash_verify_code(email, code, secret) == stored_hash


def expires_in_minutes(minutes: int) -> datetime:
    return datetime.utcnow() + timedelta(minutes=minutes)
    


