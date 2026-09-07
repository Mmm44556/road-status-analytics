from fastapi import APIRouter, Depends, HTTPException

from server.core.config import get_settings
from server.dependencies import get_metrics_collector
from server.observability.metrics import MetricsCollector
from server.schemas.system_stats import SystemStatsResponse


router = APIRouter(prefix="/system", tags=["system"])


def is_system_stats_enabled() -> bool:
    return get_settings().enable_system_stats


@router.get("/cache-stats", response_model=SystemStatsResponse)
def get_cache_stats(
    metrics: MetricsCollector = Depends(get_metrics_collector),
    enabled: bool = Depends(is_system_stats_enabled),
) -> SystemStatsResponse:
    if not enabled:
        raise HTTPException(status_code=404, detail="Not found")
    return SystemStatsResponse.model_validate(metrics.snapshot())
