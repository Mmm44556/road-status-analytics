import requests
from fastapi import APIRouter, Depends, HTTPException, Query, Response

from server.dependencies import get_metro_service
from server.schemas.metro import MetroResponse, MetroStationResponse
from server.services.metro_service import MetroService, StationNotFoundError
from server.services.road_event_service import UnsupportedCityError


router = APIRouter(prefix="/traffic/metro", tags=["metro"])


@router.get("", response_model=MetroResponse)
def get_metro(
    response: Response,
    city: str = Query("Kaohsiung", min_length=2, max_length=32),
    service: MetroService = Depends(get_metro_service),
) -> MetroResponse:
    try:
        data = service.get_city_metro_stations(city)
    except UnsupportedCityError as error:
        raise HTTPException(status_code=422, detail=str(error)) from error
    except requests.RequestException as error:
        # 隱藏上游細節，避免將 TDX 回應直接暴露給前端。
        raise HTTPException(status_code=502, detail="TDX upstream request failed") from error

    response.headers["X-Data-Source"] = "TDX"
    return MetroResponse(data=data)


@router.get("/{station_id}", response_model=MetroStationResponse)
def get_metro_station(
    station_id: str,
    response: Response,
    city: str = Query("Kaohsiung", min_length=2, max_length=32),
    service: MetroService = Depends(get_metro_service),
) -> MetroStationResponse:
    try:
        data = service.get_single_station(city, station_id)
    except UnsupportedCityError as error:
        raise HTTPException(status_code=422, detail=str(error)) from error
    except StationNotFoundError as error:
        raise HTTPException(status_code=404, detail=str(error)) from error
    except requests.RequestException as error:
        raise HTTPException(status_code=502, detail="TDX upstream request failed") from error

    response.headers["X-Data-Source"] = "TDX"
    return MetroStationResponse(data=data)
