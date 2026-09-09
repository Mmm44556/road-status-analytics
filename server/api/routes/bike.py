import requests
from fastapi import APIRouter, Depends, HTTPException, Query, Response

from server.dependencies import get_bike_service
from server.schemas.bike import BikeResponse, BikeStationResponse
from server.services.bike_service import BikeService, StationNotFoundError
from server.services.road_event_service import UnsupportedCityError


router = APIRouter(prefix="/traffic/bike", tags=["bike"])


@router.get("", response_model=BikeResponse)
def get_bike(
    response: Response,
    city: str = Query("Kaohsiung", min_length=2, max_length=32),
    service: BikeService = Depends(get_bike_service),
) -> BikeResponse:
    try:
        data = service.get_city_bikes(city)
    except UnsupportedCityError as error:
        raise HTTPException(status_code=422, detail=str(error)) from error
    except requests.RequestException as error:
        # 隱藏上游細節，避免將 TDX 回應直接暴露給前端。
        raise HTTPException(status_code=502, detail="TDX upstream request failed") from error

    response.headers["X-Data-Source"] = "TDX"
    return BikeResponse(data=data)


@router.get("/{station_id}", response_model=BikeStationResponse)
def get_bike_station(
    station_id: str,
    response: Response,
    city: str = Query("Kaohsiung", min_length=2, max_length=32),
    service: BikeService = Depends(get_bike_service),
) -> BikeStationResponse:
    try:
        data = service.get_single_station(city, station_id)
    except UnsupportedCityError as error:
        raise HTTPException(status_code=422, detail=str(error)) from error
    except StationNotFoundError as error:
        raise HTTPException(status_code=404, detail=str(error)) from error
    except requests.RequestException as error:
        raise HTTPException(status_code=502, detail="TDX upstream request failed") from error

    response.headers["X-Data-Source"] = "TDX"
    return BikeStationResponse(data=data)
