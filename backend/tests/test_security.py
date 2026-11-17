"""Password and signed-token security tests without a database dependency."""

from datetime import UTC, datetime, timedelta

import jwt
import pytest

from app.core.config import Settings
from app.core.security import (
    create_access_token,
    decode_access_token,
    hash_password,
    verify_password,
)


@pytest.fixture
def settings() -> Settings:
    return Settings(_env_file=None, jwt_secret="test-only-secret-that-is-longer-than-32-chars")


def test_password_hash_verifies_only_matching_password() -> None:
    password_hash = hash_password("secure-demo-password")

    assert password_hash != "secure-demo-password"
    assert verify_password("secure-demo-password", password_hash)
    assert not verify_password("wrong-password", password_hash)
    assert not verify_password("anything", "not-a-valid-hash")


def test_access_token_contains_expected_identity_and_lifetime(settings: Settings) -> None:
    token, expires_in = create_access_token("user-123", "traveler", settings)

    assert expires_in == settings.access_token_expire_minutes * 60
    claims = decode_access_token(token, settings)
    assert claims["sub"] == "user-123"
    assert claims["role"] == "traveler"


def test_access_token_rejects_wrong_secret(settings: Settings) -> None:
    token, _ = create_access_token("user-123", "traveler", settings)
    other_settings = Settings(
        _env_file=None,
        jwt_secret="a-different-test-secret-that-is-over-32-chars",
    )

    with pytest.raises(jwt.InvalidTokenError):
        decode_access_token(token, other_settings)


def test_access_token_rejects_expired_token(settings: Settings) -> None:
    expired = jwt.encode(
        {
            "sub": "user-123",
            "role": "traveler",
            "iat": datetime.now(UTC) - timedelta(minutes=3),
            "exp": datetime.now(UTC) - timedelta(minutes=1),
        },
        settings.jwt_secret.get_secret_value(),
        algorithm=settings.jwt_algorithm,
    )

    with pytest.raises(jwt.ExpiredSignatureError):
        decode_access_token(expired, settings)
