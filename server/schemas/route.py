from enum import Enum
from typing import Literal

from pydantic import BaseModel, Field


class Coordinate(BaseModel):
    longitude: float = Field(ge=-180, le=180)
    latitude: float = Field(ge=-90, le=90)


class RouteTravelMode(str, Enum):
    DRIVE = "drive"
    TRANSIT = "transit"
    BICYCLE = "bicycle"
    WALK = "walk"


class RouteRequest(BaseModel):
    waypoints: list[Coordinate] = Field(min_length=2, max_length=5)
    travel_mode: RouteTravelMode = RouteTravelMode.DRIVE


class RouteGeometry(BaseModel):
    type: Literal["MultiLineString"]
    coordinates: list[list[list[float]]]


class RouteResult(BaseModel):
    distance_meters: float = Field(ge=0)
    duration_seconds: float = Field(ge=0)
    geometry: RouteGeometry
    travel_mode: RouteTravelMode
    is_approximated: bool = False
    source: str


class RouteResponse(BaseModel):
    data: RouteResult
