from typing import Any

from pydantic import BaseModel


class RoadEventBundle(BaseModel):
    city: str
    preview: dict[str, Any]
    live: dict[str, Any]


class RoadEventsResponse(BaseModel):
    data: RoadEventBundle
