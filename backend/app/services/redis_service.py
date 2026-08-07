import json
import logging
import time
from collections import Counter
from typing import Any

from redis.asyncio import Redis
from redis.exceptions import RedisError


logger = logging.getLogger("bhs_app")

RATE_LIMIT_SCRIPT = """
local current = redis.call('INCR', KEYS[1])
if current == 1 then redis.call('EXPIRE', KEYS[1], ARGV[1]) end
local ttl = redis.call('TTL', KEYS[1])
return {current, ttl}
"""


class RedisService:
    """Optional Redis integration. Any Redis failure degrades safely to origin."""

    def __init__(self, client: Redis | None = None) -> None:
        self.client = client
        self.metrics: Counter[str] = Counter()

    @property
    def available(self) -> bool:
        return self.client is not None

    async def ping(self) -> bool:
        if not self.client:
            return False
        try:
            return bool(await self.client.ping())
        except RedisError:
            self.metrics["redis_errors"] += 1
            return False

    async def close(self) -> None:
        if self.client:
            try:
                await self.client.aclose()
            except RedisError:
                self.metrics["redis_errors"] += 1

    async def get_json(self, key: str) -> Any | None:
        if not self.client:
            self.metrics["cache_degraded"] += 1
            return None
        try:
            value = await self.client.get(key)
            if value is None:
                self.metrics["cache_misses"] += 1
                return None
            self.metrics["cache_hits"] += 1
            return json.loads(value)
        except (RedisError, json.JSONDecodeError, TypeError):
            self.metrics["cache_errors"] += 1
            return None

    async def set_json(self, key: str, value: Any, *, ttl_seconds: int) -> None:
        if not self.client:
            return
        try:
            await self.client.set(key, json.dumps(value, separators=(",", ":")), ex=ttl_seconds)
        except RedisError:
            self.metrics["cache_errors"] += 1

    async def invalidate_prefix(self, prefix: str) -> int:
        if not self.client:
            return 0
        try:
            keys = [key async for key in self.client.scan_iter(match=f"{prefix}*")]
            if not keys:
                return 0
            deleted = await self.client.unlink(*keys)
            self.metrics["cache_invalidations"] += int(deleted)
            return int(deleted)
        except RedisError:
            self.metrics["cache_errors"] += 1
            return 0

    async def allow(self, *, key: str, limit: int, window_seconds: int) -> tuple[bool, int | None, int | None]:
        """Atomic fixed-window limiter. Missing Redis deliberately permits traffic."""
        if not self.client:
            self.metrics["rate_limit_degraded"] += 1
            return True, None, None
        try:
            count, ttl = await self.client.eval(RATE_LIMIT_SCRIPT, 1, key, window_seconds)
            allowed = int(count) <= limit
            self.metrics["rate_limit_allowed" if allowed else "rate_limit_blocked"] += 1
            return allowed, max(0, limit - int(count)), max(0, int(ttl))
        except RedisError:
            self.metrics["rate_limit_degraded"] += 1
            return True, None, None

    def snapshot(self) -> dict[str, int]:
        return dict(self.metrics)


def cache_key(*parts: str) -> str:
    return ":".join(("bhs", "cache", *parts))


def rate_key(scope: str, identity: str) -> str:
    window = int(time.time() // 60)
    return f"bhs:rate:{scope}:{window}:{identity}"
