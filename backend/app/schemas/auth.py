"""Authentication response schemas."""

from pydantic import BaseModel, ConfigDict

from app.schemas.user import UserPublic


class AccessTokenResponse(BaseModel):
    """Short-lived bearer token and the authenticated user's safe profile."""

    model_config = ConfigDict(extra="forbid")

    access_token: str
    token_type: str = "bearer"
    expires_in: int
    user: UserPublic
