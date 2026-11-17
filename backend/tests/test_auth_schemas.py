"""Input validation tests for public account registration and login."""

import pytest
from pydantic import ValidationError

from app.schemas.user import RegistrationRole, UserCreate, UserLogin


def test_registration_normalizes_email_and_defaults_to_traveler() -> None:
    user = UserCreate(
        display_name="  Asha Rao  ",
        email="ASHA@example.com",
        password="a-long-enough-password",
    )

    assert user.display_name == "Asha Rao"
    assert user.email == "asha@example.com"
    assert user.role is RegistrationRole.TRAVELER


def test_registration_rejects_admin_role() -> None:
    with pytest.raises(ValidationError):
        UserCreate(
            display_name="Site Admin",
            email="admin@example.com",
            password="a-long-enough-password",
            role="admin",
        )


@pytest.mark.parametrize(
    "payload",
    [
        {"display_name": "A", "email": "a@example.com", "password": "a-long-enough-password"},
        {
            "display_name": "Valid Name",
            "email": "not-an-email",
            "password": "a-long-enough-password",
        },
        {
            "display_name": "Valid Name",
            "email": "a@example.com",
            "password": "short",
        },
        {
            "display_name": "Valid Name",
            "email": "a@example.com",
            "password": "a-long-enough-password",
            "is_admin": True,
        },
    ],
)
def test_registration_rejects_invalid_or_extra_input(payload: dict[str, object]) -> None:
    with pytest.raises(ValidationError):
        UserCreate.model_validate(payload)


def test_login_normalizes_email() -> None:
    login = UserLogin(email="  Traveler@Example.com ", password="password")

    assert login.email == "traveler@example.com"
