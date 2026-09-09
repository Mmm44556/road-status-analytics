import requests
from fastapi import APIRouter, Depends, HTTPException, Query, Response

from server.dependencies import get_place_search_service
from server.schemas.place import PlaceSearchResponse
from server.services.place_search_service import PlaceSearchService


router = APIRouter(prefix="/places", tags=["places"])


@router.get("/search", response_model=PlaceSearchResponse)
def search_places(
    response: Response,
    q: str = Query(..., min_length=2, max_length=100),
    city: str | None = Query(None, max_length=20),
    limit: int = Query(5, ge=1, le=10),
    service: PlaceSearchService = Depends(get_place_search_service),
) -> PlaceSearchResponse:
    try:
        results = service.search(q, city=city, limit=limit)
    except (requests.RequestException, KeyError, TypeError, ValueError) as error:
        raise HTTPException(status_code=502, detail="Place search upstream failed") from error

    response.headers["X-Data-Source"] = "Geoapify"
    return PlaceSearchResponse(data=results)
