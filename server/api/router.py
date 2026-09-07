from fastapi import APIRouter

from server.api.routes.ai_chat import router as ai_chat_router
from server.api.routes.cctv import router as cctv_router
from server.api.routes.road_events import router as road_events_router
from server.api.routes.live_traffic import router as live_traffic_router
from server.api.routes.vd import router as vd_router
from server.api.routes.bike import router as bike_router
from server.api.routes.bus import router as bus_router
from server.api.routes.metro import router as metro_router
from server.api.routes.parking_lot import router as parking_lot_router
from server.api.routes.parking_segment import router as parking_segment_router
from server.api.routes.places import router as places_router
from server.api.routes.routes import router as routes_router
from server.api.routes.system import router as system_router


api_router = APIRouter()
api_router.include_router(ai_chat_router)
api_router.include_router(road_events_router)
api_router.include_router(cctv_router)
api_router.include_router(live_traffic_router)
api_router.include_router(vd_router)
api_router.include_router(bike_router)
api_router.include_router(bus_router)
api_router.include_router(metro_router)
api_router.include_router(parking_lot_router)
api_router.include_router(parking_segment_router)
api_router.include_router(places_router)
api_router.include_router(routes_router)
api_router.include_router(system_router)
