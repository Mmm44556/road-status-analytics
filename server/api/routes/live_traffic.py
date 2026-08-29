import requests
from fastapi import APIRouter, Depends, HTTPException, Query, Response

from server.dependencies import get_live_traffic_service
from server.schemas.live_traffic import LiveTrafficResponse
from server.services.live_traffic_service import LiveTrafficService
from server.services.road_event_service import UnsupportedCityError


router = APIRouter(prefix="/traffic/live-traffic", tags=["live-traffic"])


@router.get("", response_model=LiveTrafficResponse)
def get_live_traffic(
    response: Response,
    city: str = Query("高雄市", min_length=2, max_length=32),
    service: LiveTrafficService = Depends(get_live_traffic_service),
) -> LiveTrafficResponse:
    try:
        data = service.get_city_live_traffic(city)
    except UnsupportedCityError as error:
        raise HTTPException(status_code=422, detail=str(error)) from error
    except ValueError as error:
        raise HTTPException(status_code=422, detail=str(error)) from error
    except requests.RequestException as error:
        raise HTTPException(status_code=502, detail="TDX upstream request failed") from error
    response.headers["Cache-Control"] = "public, max-age=30"
    response.headers["X-Data-Source"] = "TDX"
    return LiveTrafficResponse(data=data)
