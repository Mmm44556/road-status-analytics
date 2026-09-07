from functools import lru_cache

from fastapi import HTTPException

from server.clients.tdx_client import TdxClient, TdxConfigError
from server.clients.geoapify_client import GeoapifyClient, GeoapifyConfigError
from server.clients.gemini_client import GeminiClient, GeminiConfigError
from server.caching.factory import create_cache_backend
from server.core.config import get_settings
from server.core.rate_limiter import SlidingWindowRateLimiter
from server.services.ai_chat_service import AiChatService
from server.services.bike_service import BikeService
from server.services.bus_service import BusService
from server.services.cctv_service import CctvService
from server.services.live_traffic_service import LiveTrafficService
from server.services.metro_service import MetroService
from server.services.parking_lot_service import ParkingLotService
from server.services.parking_segment_service import ParkingSegmentService
from server.services.road_event_service import RoadEventService
from server.services.vd_service import VdService
from server.services.place_search_service import PlaceSearchService
from server.services.route_service import RouteService
from server.services.coordinated_ttl_cache import CoordinatedTtlCache
from server.observability.metrics import MetricsCollector


@lru_cache
def get_metrics_collector() -> MetricsCollector:
    return MetricsCollector()


@lru_cache
def get_tdx_client() -> TdxClient:
    """共用 TDX client 與 OAuth token，避免各圖層重複取得 token。"""
    settings = get_settings()
    try:
        return TdxClient(
            settings.tdx_client_id,
            settings.tdx_client_secret,
            metrics=get_metrics_collector(),
        )
    except TdxConfigError as error:
        raise HTTPException(status_code=503, detail="TDX is not configured") from error


@lru_cache
def get_tdx_cache() -> CoordinatedTtlCache:
    settings = get_settings()
    backend = create_cache_backend(settings.redis_url, settings.cache_namespace)
    return CoordinatedTtlCache(backend=backend, metrics=get_metrics_collector())


@lru_cache
def get_place_search_service() -> PlaceSearchService:
    settings = get_settings()
    try:
        client = GeoapifyClient(settings.geoapify_api_key)
    except GeoapifyConfigError as error:
        raise HTTPException(
            status_code=503,
            detail="Geoapify is not configured",
        ) from error
    return PlaceSearchService(client)


@lru_cache
def get_route_service() -> RouteService:
    settings = get_settings()
    try:
        client = GeoapifyClient(settings.geoapify_api_key)
    except GeoapifyConfigError as error:
        raise HTTPException(
            status_code=503,
            detail="Geoapify is not configured",
        ) from error
    return RouteService(client)


@lru_cache
def get_ai_chat_service() -> AiChatService:
    settings = get_settings()
    try:
        client = GeminiClient(settings.gemini_api_key)
    except GeminiConfigError as error:
        raise HTTPException(status_code=503, detail="Gemini is not configured") from error
    return AiChatService(client)


@lru_cache
def get_ai_chat_rate_limiter() -> SlidingWindowRateLimiter:
    # 免費版 Gemini 每日/每分鐘額度都很有限，擋掉單一來源短時間內狂發訊息，
    # 避免公開展示時被無意或惡意的迴圈把額度燒光。
    return SlidingWindowRateLimiter(max_requests=8, window_seconds=60)


@lru_cache
def get_road_event_service() -> RoadEventService:
    # 共用 service，讓記憶體快取可跨請求生效。
    return RoadEventService(get_tdx_client(), ttl_seconds=120, cache=get_tdx_cache())


@lru_cache
def get_cctv_service() -> CctvService:
    # 共用 service，讓記憶體快取可跨請求生效。
    return CctvService(get_tdx_client(), cache=get_tdx_cache())


@lru_cache
def get_live_traffic_service() -> LiveTrafficService:
    return LiveTrafficService(get_tdx_client(), cache=get_tdx_cache())


@lru_cache
def get_vd_service() -> VdService:
    return VdService(get_tdx_client(), cache=get_tdx_cache())


@lru_cache
def get_bike_service() -> BikeService:
    return BikeService(get_tdx_client(), cache=get_tdx_cache())


@lru_cache
def get_bus_service() -> BusService:
    return BusService(get_tdx_client(), cache=get_tdx_cache())


@lru_cache
def get_metro_service() -> MetroService:
    return MetroService(get_tdx_client(), cache=get_tdx_cache())


@lru_cache
def get_parking_lot_service() -> ParkingLotService:
    return ParkingLotService(get_tdx_client(), cache=get_tdx_cache())


@lru_cache
def get_parking_segment_service() -> ParkingSegmentService:
    return ParkingSegmentService(get_tdx_client(), cache=get_tdx_cache())
