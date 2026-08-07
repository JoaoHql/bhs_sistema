from functools import lru_cache
from contextlib import contextmanager
from collections.abc import Iterator

import psycopg
from psycopg.rows import dict_row
from psycopg_pool import ConnectionPool

from app.core.config import get_settings


@lru_cache(maxsize=8)
def get_connection_pool(database_url: str) -> ConnectionPool:
    settings = get_settings()
    return ConnectionPool(
        conninfo=database_url,
        min_size=settings.db_pool_min_size,
        max_size=settings.db_pool_max_size,
        max_waiting=settings.db_pool_max_waiting,
        timeout=settings.db_pool_timeout_seconds,
        kwargs={"row_factory": dict_row},
        open=True,
    )


@contextmanager
def readonly_connection(pool: ConnectionPool) -> Iterator[psycopg.Connection]:
    """Evita BEGIN/COMMIT e seus round-trips em consultas somente leitura."""
    with pool.connection() as conn:
        conn.autocommit = True
        try:
            yield conn
        finally:
            conn.autocommit = False
