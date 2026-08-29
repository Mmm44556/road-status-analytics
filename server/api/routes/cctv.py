import requests
from fastapi import APIRouter, Depends, HTTPException, Query, Response
from fastapi.responses import StreamingResponse

from server.dependencies import get_cctv_service
from server.schemas.cctv import CctvResponse
from server.services.cctv_service import CctvService
from server.services.road_event_service import UnsupportedCityError


router = APIRouter(prefix="/traffic/cctv", tags=["cctv"])


@router.get("/image", response_class=StreamingResponse)
def get_cctv_image(
    city: str = Query(..., min_length=2, max_length=32),
    camera_id: str = Query(..., min_length=1, max_length=128),
    service: CctvService = Depends(get_cctv_service),
) -> StreamingResponse:
    try:
        upstream = service.open_camera_stream(city, camera_id, top=1000)
    except UnsupportedCityError as error:
        raise HTTPException(status_code=422, detail=str(error)) from error
    except LookupError as error:
        raise HTTPException(status_code=404, detail="CCTV camera not found") from error
    except ValueError as error:
        raise HTTPException(status_code=502, detail="CCTV stream is not allowed") from error
    except requests.RequestException as error:
        raise HTTPException(status_code=502, detail="CCTV stream request failed") from error

    content_type = upstream.headers.get("Content-Type", "").split(";", 1)[0]
    if not (content_type.startswith("image/") or content_type == "multipart/x-mixed-replace"):
        upstream.close()
        raise HTTPException(status_code=502, detail="CCTV stream format is unsupported")

    def stream_chunks():
        try:
            yield from upstream.iter_content(chunk_size=64 * 1024)
        finally:
            upstream.close()

    return StreamingResponse(
        stream_chunks(),
        media_type=upstream.headers.get("Content-Type", content_type),
        headers={
            "Cache-Control": "no-store",
            "X-Content-Type-Options": "nosniff",
        },
    )


@router.get("", response_model=CctvResponse)
def get_cctv(
    response: Response,
    city: str = Query("Kaohsiung", min_length=2, max_length=32),
    # 單一縣市的 CCTV 總數常超過 300 支（如臺北市約 384 支），上限需高於此。
    top: int = Query(500, ge=1, le=1000),
    service: CctvService = Depends(get_cctv_service),
) -> CctvResponse:
    try:
        cctv = service.get_city_cctv(city, top=top)
    except UnsupportedCityError as error:
        raise HTTPException(status_code=422, detail=str(error)) from error
    except requests.RequestException as error:
        # 隱藏上游細節，避免將 TDX 回應直接暴露給前端。
        raise HTTPException(status_code=502, detail="TDX upstream request failed") from error

    response.headers["X-Data-Source"] = "TDX"
    return CctvResponse(data=cctv)
