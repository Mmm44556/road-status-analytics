import requests
from fastapi import APIRouter, Depends, HTTPException, Query, Response

from server.dependencies import get_road_event_service
from server.schemas.road_event import RoadEventsResponse
from server.services.road_event_service import RoadEventService, UnsupportedCityError


router = APIRouter(prefix="/traffic/road-events", tags=["road-events"])


@router.get("", response_model=RoadEventsResponse)
def get_road_events(
    response: Response,
    city: str = Query("Kaohsiung", min_length=2, max_length=32),
    top: int = Query(100, ge=1, le=200),
    service: RoadEventService = Depends(get_road_event_service),
) -> RoadEventsResponse:
    try:
        events = service.get_city_events(city, top=top)
    except UnsupportedCityError as error:
        raise HTTPException(status_code=422, detail=str(error)) from error
    except requests.RequestException as error:
        # 隱藏上游細節，避免將 TDX 回應直接暴露給前端。
        raise HTTPException(status_code=502, detail="TDX upstream request failed") from error

    response.headers["X-Data-Source"] = "TDX"
    return RoadEventsResponse(data=events)
