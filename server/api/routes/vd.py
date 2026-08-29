import requests
from fastapi import APIRouter, Depends, HTTPException, Query, Response

from server.dependencies import get_vd_service
from server.schemas.vd import VdReadingResponse, VdResponse
from server.services.road_event_service import UnsupportedCityError
from server.services.vd_service import VdNotFoundError, VdService


router = APIRouter(prefix="/traffic/vd", tags=["vd"])


@router.get("", response_model=VdResponse)
def get_vd(
    response: Response,
    city: str = Query("Kaohsiung", min_length=2, max_length=32),
    service: VdService = Depends(get_vd_service),
) -> VdResponse:
    try:
        data = service.get_city_vds(city)
    except UnsupportedCityError as error:
        raise HTTPException(status_code=422, detail=str(error)) from error
    except requests.RequestException as error:
        # 隱藏上游細節，避免將 TDX 回應直接暴露給前端。
        raise HTTPException(status_code=502, detail="TDX upstream request failed") from error

    response.headers["X-Data-Source"] = "TDX"
    return VdResponse(data=data)


@router.get("/{vd_id}", response_model=VdReadingResponse)
def get_vd_reading(
    vd_id: str,
    response: Response,
    city: str = Query("Kaohsiung", min_length=2, max_length=32),
    service: VdService = Depends(get_vd_service),
) -> VdReadingResponse:
    try:
        data = service.get_single_vd(city, vd_id)
    except UnsupportedCityError as error:
        raise HTTPException(status_code=422, detail=str(error)) from error
    except VdNotFoundError as error:
        raise HTTPException(status_code=404, detail=str(error)) from error
    except requests.RequestException as error:
        raise HTTPException(status_code=502, detail="TDX upstream request failed") from error

    response.headers["X-Data-Source"] = "TDX"
    return VdReadingResponse(data=data)
