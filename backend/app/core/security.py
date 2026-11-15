"""Password hashing and signed access tokens."""

from datetime import UTC, datetime, timedelta
from typing import Any

import jwt
from pwdlib import PasswordHash
from pwdlib.exceptions import UnknownHashError

from app.core.config import Settings

password_hasher = PasswordHash.recommended()


def hash_password(password: str) -> str:
    """Hash a password with the configured Argon2id hasher."""

    return password_hasher.hash(password)


def verify_password(password: str, password_hash: str) -> bool:
    """Compare a plaintext password with its stored Argon2 hash."""

    try:
        return password_hasher.verify(password, password_hash)
    except (UnknownHashError, ValueError, TypeError):
        return False


def create_access_token(subject: str, role: str, settings: Settings) -> tuple[str, int]:
    """Create a signed bearer token and return it with its lifetime in seconds."""

    lifetime = timedelta(minutes=settings.access_token_expire_minutes)
    now = datetime.now(UTC)
    claims: dict[str, Any] = {
        "sub": subject,
        "role": role,
        "iat": now,
        "exp": now + lifetime,
    }
    token = jwt.encode(claims, settings.jwt_secret.get_secret_value(), algorithm=settings.jwt_algorithm)
    return token, int(lifetime.total_seconds())


def decode_access_token(token: str, settings: Settings) -> dict[str, Any]:
    """Decode and validate a signed bearer token."""

    return jwt.decode(
        token,
        settings.jwt_secret.get_secret_value(),
        algorithms=[settings.jwt_algorithm],
        options={"require": ["exp", "iat", "sub", "role"]},
    )
