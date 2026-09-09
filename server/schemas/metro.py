from typing import Any

from pydantic import BaseModel


class MetroBundle(BaseModel):
    city: str
    stations: list[dict[str, Any]]


class MetroResponse(BaseModel):
    data: MetroBundle


class MetroStationResponse(BaseModel):
    data: dict[str, Any]
