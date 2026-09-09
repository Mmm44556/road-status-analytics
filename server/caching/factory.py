from __future__ import annotations

import logging

from server.caching.backends import (
    CacheBackend,
    FallbackCacheBackend,
    MemoryCacheBackend,
    RedisCacheBackend,
)


logger = logging.getLogger(__name__)


def create_cache_backend(redis_url: str, namespace: str) -> CacheBackend:
    """有 Redis 設定時建立共用快取，否則使用程序內快取。"""
    memory = MemoryCacheBackend()
    if not redis_url:
        return memory
    try:
        redis = RedisCacheBackend(redis_url, namespace=namespace)
    except (ImportError, ValueError):
        logger.warning("Redis cache is unavailable; using memory cache", exc_info=True)
        return memory
    return FallbackCacheBackend(redis, memory)
