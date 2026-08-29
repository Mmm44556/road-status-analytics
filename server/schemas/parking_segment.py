from typing import Any

from pydantic import BaseModel


class ParkingSegmentBundle(BaseModel):
    city: str
    segments: list[dict[str, Any]]


class ParkingSegmentResponse(BaseModel):
    data: ParkingSegmentBundle


class ParkingSegmentReadingResponse(BaseModel):
    data: dict[str, Any]
