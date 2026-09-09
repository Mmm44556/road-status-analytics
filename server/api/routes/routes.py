import requests
from fastapi import APIRouter, Depends, HTTPException, Response

from server.dependencies import get_route_service
from server.schemas.route import RouteRequest, RouteResponse
from server.services.route_service import RouteService


router = APIRouter(prefix="/routes", tags=["routes"])


@router.post("", response_model=RouteResponse)
def calculate_route(
    request: RouteRequest,
    response: Response,
    service: RouteService = Depends(get_route_service),
) -> RouteResponse:
    try:
        route = service.calculate(
            [
                (waypoint.longitude, waypoint.latitude)
                for waypoint in request.waypoints
            ],
            request.travel_mode,
        )
    except (requests.RequestException, KeyError, TypeError, ValueError) as error:
        raise HTTPException(status_code=502, detail="Route upstream failed") from error

    response.headers["X-Data-Source"] = "Geoapify"
    return RouteResponse(data=route)
