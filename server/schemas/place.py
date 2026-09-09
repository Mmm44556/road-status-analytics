from pydantic import BaseModel


class PlaceSearchResult(BaseModel):
    id: str
    name: str
    address: str
    longitude: float
    latitude: float
    type: str
    source: str


class PlaceSearchResponse(BaseModel):
    data: list[PlaceSearchResult]
