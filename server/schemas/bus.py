from pydantic import BaseModel


class BusStop(BaseModel):
    stopId: str
    name: str
    address: str
    positionLon: float
    positionLat: float
    updateTime: str | None = None


class BusBundle(BaseModel):
    city: str
    stops: list[BusStop]


class BusResponse(BaseModel):
    data: BusBundle


class BusArrival(BaseModel):
    routeId: str
    routeName: str
    direction: int
    destination: str
    estimateSeconds: int | None = None
    stopStatus: int
    plateNumber: str
    nextBusTime: str | None = None
    isLastBus: bool
    updateTime: str | None = None


class BusArrivalBundle(BaseModel):
    city: str
    stopId: str
    arrivals: list[BusArrival]


class BusArrivalResponse(BaseModel):
    data: BusArrivalBundle


class BusRouteShape(BaseModel):
    city: str
    routeId: str
    routeName: str
    direction: int
    coordinates: list[list[float]]
    updateTime: str | None = None


class BusRouteShapeResponse(BaseModel):
    data: BusRouteShape
