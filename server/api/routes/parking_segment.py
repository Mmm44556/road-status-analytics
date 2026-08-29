import requests
from fastapi import APIRouter, Depends, HTTPException, Query, Response

from server.dependencies import get_parking_segment_service
from server.schemas.parking_segment import (
    ParkingSegmentReadingResponse,
    ParkingSegmentResponse,
)
from server.services.parking_segment_service import (
    ParkingSegmentService,
    SegmentNotFoundError,
)
from server.services.road_event_service import UnsupportedCityError


router = APIRouter(prefix="/traffic/parking/segments", tags=["parking"])


@router.get("", response_model=ParkingSegmentResponse)
def get_parking_segments(
    response: Response,
    city: str = Query("Kaohsiung", min_length=2, max_length=32),
    service: ParkingSegmentService = Depends(get_parking_segment_service),
) -> ParkingSegmentResponse:
    try:
        data = service.get_city_parking_segments(city)
    except UnsupportedCityError as error:
        raise HTTPException(status_code=422, detail=str(error)) from error
    except requests.RequestException as error:
        # 隱藏上游細節，避免將 TDX 回應直接暴露給前端。
        raise HTTPException(status_code=502, detail="TDX upstream request failed") from error

    response.headers["X-Data-Source"] = "TDX"
    return ParkingSegmentResponse(data=data)


@router.get("/{segment_id}", response_model=ParkingSegmentReadingResponse)
def get_parking_segment(
    segment_id: str,
    response: Response,
    city: str = Query("Kaohsiung", min_length=2, max_length=32),
    service: ParkingSegmentService = Depends(get_parking_segment_service),
) -> ParkingSegmentReadingResponse:
    try:
        data = service.get_single_segment(city, segment_id)
    except UnsupportedCityError as error:
        raise HTTPException(status_code=422, detail=str(error)) from error
    except SegmentNotFoundError as error:
        raise HTTPException(status_code=404, detail=str(error)) from error
    except requests.RequestException as error:
        raise HTTPException(status_code=502, detail="TDX upstream request failed") from error

    response.headers["X-Data-Source"] = "TDX"
    return ParkingSegmentReadingResponse(data=data)
