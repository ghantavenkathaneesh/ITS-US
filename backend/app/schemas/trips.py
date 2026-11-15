"""Validated trip creation, update, and response models."""

from datetime import datetime

from pydantic import BaseModel, ConfigDict, Field, model_validator

from app.schemas.trip_planner import TimeBlock


class TripActivityWrite(BaseModel):
    """Traveler-editable activity content referencing a published place ID."""

    model_config = ConfigDict(extra="forbid")

    place_id: str = Field(pattern=r"^[0-9a-fA-F]{24}$")
    time_block: TimeBlock
    idea: str = Field(min_length=1, max_length=350, strip_whitespace=True)


class TripDayWrite(BaseModel):
    """One saved day in a traveler-owned trip."""

    model_config = ConfigDict(extra="forbid")

    day_number: int = Field(ge=1, le=5)
    theme: str = Field(min_length=1, max_length=100, strip_whitespace=True)
    activities: list[TripActivityWrite] = Field(min_length=1, max_length=12)


class TripWrite(BaseModel):
    """Validated traveler input for creating or replacing a personal trip."""

    model_config = ConfigDict(extra="forbid")

    city_slug: str = Field(pattern=r"^[a-z0-9]+(?:-[a-z0-9]+)*$", max_length=80)
    title: str = Field(min_length=2, max_length=100, strip_whitespace=True)
    overview: str = Field(min_length=1, max_length=600, strip_whitespace=True)
    days: list[TripDayWrite] = Field(min_length=1, max_length=5)

    @model_validator(mode="after")
    def day_numbers_are_sequential(self) -> "TripWrite":
        expected = list(range(1, len(self.days) + 1))
        if [day.day_number for day in self.days] != expected:
            raise ValueError("Trip day numbers must be sequential starting at one")
        return self


class TripActivity(BaseModel):
    """Saved activity with the place name resolved from a trusted catalog record."""

    model_config = ConfigDict(extra="forbid")

    place_id: str
    place_name: str
    is_demo: bool
    time_block: TimeBlock
    idea: str


class TripDay(BaseModel):
    """Stored and validated day plan."""

    model_config = ConfigDict(extra="forbid")

    day_number: int
    theme: str
    activities: list[TripActivity]


class TripPublic(BaseModel):
    """Trip fields visible to the owning traveler."""

    model_config = ConfigDict(extra="forbid")

    id: str
    city_slug: str
    city_name: str
    title: str
    overview: str
    days: list[TripDay]
    created_at: datetime
    updated_at: datetime
