from typing import Any

from pydantic import BaseModel


class ParkingLotBundle(BaseModel):
    city: str
    lots: list[dict[str, Any]]


class ParkingLotResponse(BaseModel):
    data: ParkingLotBundle


class ParkingLotReadingResponse(BaseModel):
    data: dict[str, Any]
