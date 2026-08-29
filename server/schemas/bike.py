from typing import Any

from pydantic import BaseModel


class BikeBundle(BaseModel):
    city: str
    stations: list[dict[str, Any]]


class BikeResponse(BaseModel):
    data: BikeBundle


class BikeStationResponse(BaseModel):
    data: dict[str, Any]
