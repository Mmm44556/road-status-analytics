from pydantic import BaseModel


class LiveTrafficSegment(BaseModel):
    sectionId: str
    roadName: str
    sectionName: str
    roadDirection: str
    coordinates: list[list[float]]
    travelSpeed: float | None = None
    travelTime: int | None = None
    congestionLevel: int
    dataCollectTime: str
    source: str


class LiveTrafficBundle(BaseModel):
    city: str
    updatedAt: str
    segments: list[LiveTrafficSegment]


class LiveTrafficResponse(BaseModel):
    data: LiveTrafficBundle
