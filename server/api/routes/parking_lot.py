import requests
from fastapi import APIRouter, Depends, HTTPException, Query, Response

from server.dependencies import get_parking_lot_service
from server.schemas.parking_lot import ParkingLotReadingResponse, ParkingLotResponse
from server.services.parking_lot_service import LotNotFoundError, ParkingLotService
from server.services.road_event_service import UnsupportedCityError


router = APIRouter(prefix="/traffic/parking/lots", tags=["parking"])


@router.get("", response_model=ParkingLotResponse)
def get_parking_lots(
    response: Response,
    city: str = Query("Kaohsiung", min_length=2, max_length=32),
    service: ParkingLotService = Depends(get_parking_lot_service),
) -> ParkingLotResponse:
    try:
        data = service.get_city_parking_lots(city)
    except UnsupportedCityError as error:
        raise HTTPException(status_code=422, detail=str(error)) from error
    except requests.RequestException as error:
        # 隱藏上游細節，避免將 TDX 回應直接暴露給前端。
        raise HTTPException(status_code=502, detail="TDX upstream request failed") from error

    response.headers["X-Data-Source"] = "TDX"
    return ParkingLotResponse(data=data)


@router.get("/{lot_id}", response_model=ParkingLotReadingResponse)
def get_parking_lot(
    lot_id: str,
    response: Response,
    city: str = Query("Kaohsiung", min_length=2, max_length=32),
    service: ParkingLotService = Depends(get_parking_lot_service),
) -> ParkingLotReadingResponse:
    try:
        data = service.get_single_lot(city, lot_id)
    except UnsupportedCityError as error:
        raise HTTPException(status_code=422, detail=str(error)) from error
    except LotNotFoundError as error:
        raise HTTPException(status_code=404, detail=str(error)) from error
    except requests.RequestException as error:
        raise HTTPException(status_code=502, detail="TDX upstream request failed") from error

    response.headers["X-Data-Source"] = "TDX"
    return ParkingLotReadingResponse(data=data)
