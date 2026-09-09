from pydantic import BaseModel, Field


class CacheMetricCounts(BaseModel):
    freshHits: int = 0
    staleHits: int = 0
    misses: int = 0
    refreshSuccesses: int = 0
    refreshFailures: int = 0


class TdxMetricCounts(BaseModel):
    requests: int = 0
    successes: int = 0
    retries: int = 0
    rateLimited: int = 0
    serverErrors: int = 0
    failures: int = 0


class CacheMetricGroup(BaseModel):
    total: CacheMetricCounts
    byResource: dict[str, CacheMetricCounts] = Field(default_factory=dict)


class TdxMetricGroup(BaseModel):
    total: TdxMetricCounts
    byResource: dict[str, TdxMetricCounts] = Field(default_factory=dict)


class SystemStatsResponse(BaseModel):
    startedAt: str
    cache: CacheMetricGroup
    tdx: TdxMetricGroup
