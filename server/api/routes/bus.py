import requests
from fastapi import APIRouter, Depends, HTTPException, Query, Response

from server.dependencies import get_bus_service
from server.schemas.bus import BusArrivalResponse, BusResponse, BusRouteShapeResponse
from server.services.bus_service import BusService, RouteShapeNotFoundError
from server.services.road_event_service import UnsupportedCityError


router = APIRouter(prefix="/traffic/bus", tags=["bus"])


@router.get("", response_model=BusResponse)
def get_bus_stops(
    response: Response,
    city: str = Query("Kaohsiung", min_length=2, max_length=32),
    service: BusService = Depends(get_bus_service),
) -> BusResponse:
    try:
        data = service.get_city_stops(city)
    except UnsupportedCityError as error:
        raise HTTPException(status_code=422, detail=str(error)) from error
    except requests.RequestException as error:
        raise HTTPException(status_code=502, detail="TDX upstream request failed") from error

    response.headers["X-Data-Source"] = "TDX"
    return BusResponse(data=data)


@router.get("/arrivals", response_model=BusArrivalResponse)
def get_bus_arrivals(
    response: Response,
    city: str = Query(..., min_length=2, max_length=32),
    stop_id: str = Query(..., min_length=2, max_length=64, pattern=r"^[A-Za-z0-9_-]+$"),
    service: BusService = Depends(get_bus_service),
) -> BusArrivalResponse:
    try:
        data = service.get_stop_arrivals(city, stop_id)
    except UnsupportedCityError as error:
        raise HTTPException(status_code=422, detail=str(error)) from error
    except requests.RequestException as error:
        raise HTTPException(status_code=502, detail="TDX upstream request failed") from error

    response.headers["X-Data-Source"] = "TDX"
    return BusArrivalResponse(data=data)


@router.get("/route-shape", response_model=BusRouteShapeResponse)
def get_bus_route_shape(
    response: Response,
    city: str = Query(..., min_length=2, max_length=32),
    route_id: str = Query(..., min_length=1, max_length=64, pattern=r"^[A-Za-z0-9_-]+$"),
    direction: int = Query(..., ge=0, le=1),
    service: BusService = Depends(get_bus_service),
) -> BusRouteShapeResponse:
    try:
        data = service.get_route_shape(city, route_id, direction)
    except UnsupportedCityError as error:
        raise HTTPException(status_code=422, detail=str(error)) from error
    except RouteShapeNotFoundError as error:
        raise HTTPException(status_code=404, detail=str(error)) from error
    except requests.RequestException as error:
        raise HTTPException(status_code=502, detail="TDX upstream request failed") from error

    response.headers["X-Data-Source"] = "TDX"
    return BusRouteShapeResponse(data=data)
