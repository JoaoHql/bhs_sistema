import asyncio

from fastapi.testclient import TestClient

from app.main import app
from app.services.redis_service import RedisService


class FakeRedis:
    def __init__(self) -> None:
        self.values: dict[str, str] = {}
        self.counts: dict[str, int] = {}
        self.closed = False

    async def ping(self) -> bool:
        return True

    async def aclose(self) -> None:
        self.closed = True

    async def get(self, key: str) -> str | None:
        return self.values.get(key)

    async def set(self, key: str, value: str, *, ex: int) -> bool:
        self.values[key] = value
        return True

    async def unlink(self, *keys: str) -> int:
        deleted = 0
        for key in keys:
            deleted += int(self.values.pop(key, None) is not None)
        return deleted

    async def eval(self, _script: str, _keys: int, key: str, _window: int) -> list[int]:
        self.counts[key] = self.counts.get(key, 0) + 1
        return [self.counts[key], 60]

    async def scan_iter(self, *, match: str):
        prefix = match.removesuffix("*")
        for key in tuple(self.values):
            if key.startswith(prefix):
                yield key


def test_cache_rate_limit_and_invalidation_are_redis_backed() -> None:
    async def scenario() -> None:
        redis = RedisService(FakeRedis())
        await redis.set_json("bhs:cache:tenant:gelobel:modules", {"items": [1]}, ttl_seconds=60)
        assert await redis.get_json("bhs:cache:tenant:gelobel:modules") == {"items": [1]}
        assert await redis.invalidate_prefix("bhs:cache:tenant:gelobel:") == 1
        assert await redis.get_json("bhs:cache:tenant:gelobel:modules") is None

        assert (await redis.allow(key="bhs:rate:test", limit=2, window_seconds=60))[0] is True
        assert (await redis.allow(key="bhs:rate:test", limit=2, window_seconds=60))[0] is True
        assert (await redis.allow(key="bhs:rate:test", limit=2, window_seconds=60))[0] is False
        assert redis.snapshot()["cache_hits"] == 1
        assert redis.snapshot()["rate_limit_blocked"] == 1

    asyncio.run(scenario())


def test_login_rate_limit_returns_headers_without_redis_failover(client: TestClient) -> None:
    fake = FakeRedis()
    app.state.redis_service = RedisService(fake)
    payload = {"email": "staff@bhs.com.br", "password": "bhs123"}

    for _ in range(5):
        response = client.post("/api/v1/auth/login", json=payload)
        assert response.status_code == 200
        assert response.headers["x-ratelimit-limit"] == "5"

    blocked = client.post("/api/v1/auth/login", json=payload)
    assert blocked.status_code == 429
    assert blocked.headers["retry-after"] == "60"
    assert blocked.headers["x-ratelimit-remaining"] == "0"
