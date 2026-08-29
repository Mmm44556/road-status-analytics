from functools import lru_cache

from fastapi import HTTPException

from server.clients.tdx_client import TdxClient, TdxConfigError
from server.core.config import get_settings
from server.services.bike_service import BikeService
from server.services.cctv_service import CctvService
from server.services.live_traffic_service import LiveTrafficService
from server.services.metro_service import MetroService
from server.services.parking_lot_service import ParkingLotService
from server.services.parking_segment_service import ParkingSegmentService
from server.services.road_event_service import RoadEventService
from server.services.vd_service import VdService


@lru_cache
def get_road_event_service() -> RoadEventService:
    # 共用 service，讓記憶體快取可跨請求生效。
    settings = get_settings()
    try:
        client = TdxClient(settings.tdx_client_id, settings.tdx_client_secret)
    except TdxConfigError as error:
        raise HTTPException(status_code=503, detail="TDX is not configured") from error
    return RoadEventService(client, ttl_seconds=120)


@lru_cache
def get_cctv_service() -> CctvService:
    # 共用 service，讓記憶體快取可跨請求生效。
    settings = get_settings()
    try:
        client = TdxClient(settings.tdx_client_id, settings.tdx_client_secret)
    except TdxConfigError as error:
        raise HTTPException(status_code=503, detail="TDX is not configured") from error
    return CctvService(client)


@lru_cache
def get_live_traffic_service() -> LiveTrafficService:
    settings = get_settings()
    try:
        client = TdxClient(settings.tdx_client_id, settings.tdx_client_secret)
    except TdxConfigError as error:
        raise HTTPException(status_code=503, detail="TDX is not configured") from error
    return LiveTrafficService(client)


@lru_cache
def get_vd_service() -> VdService:
    settings = get_settings()
    try:
        client = TdxClient(settings.tdx_client_id, settings.tdx_client_secret)
    except TdxConfigError as error:
        raise HTTPException(status_code=503, detail="TDX is not configured") from error
    return VdService(client)


@lru_cache
def get_bike_service() -> BikeService:
    settings = get_settings()
    try:
        client = TdxClient(settings.tdx_client_id, settings.tdx_client_secret)
    except TdxConfigError as error:
        raise HTTPException(status_code=503, detail="TDX is not configured") from error
    return BikeService(client)


@lru_cache
def get_metro_service() -> MetroService:
    settings = get_settings()
    try:
        client = TdxClient(settings.tdx_client_id, settings.tdx_client_secret)
    except TdxConfigError as error:
        raise HTTPException(status_code=503, detail="TDX is not configured") from error
    return MetroService(client)


@lru_cache
def get_parking_lot_service() -> ParkingLotService:
    settings = get_settings()
    try:
        client = TdxClient(settings.tdx_client_id, settings.tdx_client_secret)
    except TdxConfigError as error:
        raise HTTPException(status_code=503, detail="TDX is not configured") from error
    return ParkingLotService(client)


@lru_cache
def get_parking_segment_service() -> ParkingSegmentService:
    settings = get_settings()
    try:
        client = TdxClient(settings.tdx_client_id, settings.tdx_client_secret)
    except TdxConfigError as error:
        raise HTTPException(status_code=503, detail="TDX is not configured") from error
    return ParkingSegmentService(client)
