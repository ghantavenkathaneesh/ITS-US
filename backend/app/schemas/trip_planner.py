"""Validated input and output models for AI-assisted itineraries."""

from enum import StrEnum

from pydantic import BaseModel, ConfigDict, Field, field_validator

from app.schemas.city import CityPublic


class TravelPace(StrEnum):
    """How much activity a traveler wants in a day."""

    RELAXED = "relaxed"
    BALANCED = "balanced"
    FULL = "full"


class TimeBlock(StrEnum):
    """Suggested itinerary grouping, not a venue's opening hours."""

    MORNING = "morning"
    AFTERNOON = "afternoon"
    EVENING = "evening"


class TripPlanRequest(BaseModel):
    """Validated traveler preferences for an unsaved plan."""

    model_config = ConfigDict(extra="forbid")

    city_slug: str = Field(pattern=r"^[a-z0-9]+(?:-[a-z0-9]+)*$", max_length=80)
    days: int = Field(ge=1, le=5)
    interests: list[str] = Field(min_length=1, max_length=5)
    pace: TravelPace = TravelPace.BALANCED

    @field_validator("interests")
    @classmethod
    def normalize_interests(cls, values: list[str]) -> list[str]:
        cleaned = [value.strip() for value in values]
        if any(not value or len(value) > 40 for value in cleaned):
            raise ValueError("Each interest must contain between 1 and 40 characters")
        unique = list(dict.fromkeys(cleaned))
        if not unique:
            raise ValueError("Choose at least one interest")
        return unique


class GeneratedActivity(BaseModel):
    """Model-generated activity text tied to a supplied catalog place ID."""

    model_config = ConfigDict(extra="forbid")

    place_id: str
    time_block: TimeBlock
    idea: str


class GeneratedDay(BaseModel):
    """One proposed day in the generated plan."""

    model_config = ConfigDict(extra="forbid")

    day_number: int
    theme: str
    activities: list[GeneratedActivity]


class GeneratedTripPlan(BaseModel):
    """Structured model output before catalog IDs are resolved."""

    model_config = ConfigDict(extra="forbid")

    title: str
    overview: str
    days: list[GeneratedDay]


class PlannedActivity(BaseModel):
    """Public itinerary activity enriched from a trusted place record."""

    model_config = ConfigDict(extra="forbid")

    place_id: str
    place_name: str
    is_demo: bool
    time_block: TimeBlock
    idea: str


class PlannedDay(BaseModel):
    """A day plan enriched with trusted catalog details."""

    model_config = ConfigDict(extra="forbid")

    day_number: int
    theme: str
    activities: list[PlannedActivity]


class TripPlanResponse(BaseModel):
    """Validated itinerary returned to the traveler; it is not saved yet."""

    model_config = ConfigDict(extra="forbid")

    city: CityPublic
    title: str
    overview: str
    days: list[PlannedDay]
