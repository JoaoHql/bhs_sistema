import asyncio
from collections.abc import Callable
from typing import Any, Protocol, TypeVar

import psycopg
from psycopg.rows import dict_row

from app.core.db import get_connection_pool, readonly_connection

T = TypeVar("T")


class UpdateRepositoryProtocol(Protocol):
    async def record_run_start(self, client_id: str, area: str, trigger: str) -> str: ...
    async def record_run_finish(self, run_id: str, *, status: str, rows_affected: int | None = None, error_message: str | None = None, metadata: dict[str, Any] | None = None) -> None: ...
    async def list_recent_runs(self, client_id: str, limit: int = 50) -> list[dict[str, Any]]: ...
    async def get_latest_success(self, client_id: str, area: str) -> dict[str, Any] | None: ...
    async def delete_run(self, client_id: str, run_id: str) -> None: ...


class UpdateRepository:
    def __init__(self, database_url: str) -> None:
        self.database_url = database_url
        self.pool = get_connection_pool(database_url)

    async def _run(self, operation: Callable[[], T]) -> T:
        return await asyncio.to_thread(operation)

    def _connect(self) -> psycopg.Connection:
        return self.pool.connection()

    def _read_connection(self):
        return readonly_connection(self.pool)

    async def record_run_start(self, client_id: str, area: str, trigger: str) -> str:
        def operation() -> str:
            with self._connect() as conn, conn.transaction():
                row = conn.execute(
                    """
                    insert into app_core.tenant_update_runs (client_id, area, trigger, status)
                    values (%s::uuid, %s, %s, 'running')
                    returning id::text
                    """,
                    (client_id, area, trigger),
                ).fetchone()
            return row["id"]

        return await self._run(operation)

    async def record_run_finish(
        self,
        run_id: str,
        *,
        status: str,
        rows_affected: int | None = None,
        error_message: str | None = None,
        metadata: dict[str, Any] | None = None,
    ) -> None:
        def operation() -> None:
            with self._connect() as conn, conn.transaction():
                conn.execute(
                    """
                    update app_core.tenant_update_runs
                    set status = %s,
                        rows_affected = %s,
                        error_message = %s,
                        finished_at = now()
                    where id = %s::uuid
                    """,
                    (status, rows_affected, error_message, run_id),
                )

        await self._run(operation)

    async def list_recent_runs(self, client_id: str, limit: int = 50) -> list[dict[str, Any]]:
        def operation() -> list[dict[str, Any]]:
            with self._read_connection() as conn:
                return conn.execute(
                    """
                    select
                        id::text,
                        area,
                        status,
                        trigger,
                        rows_affected,
                        error_message,
                        started_at,
                        finished_at
                    from app_core.tenant_update_runs
                    where client_id = %s::uuid
                    order by started_at desc
                    limit %s
                    """,
                    (client_id, limit),
                ).fetchall()

        return await self._run(operation)

    async def get_latest_success(self, client_id: str, area: str) -> dict[str, Any] | None:
        def operation() -> dict[str, Any] | None:
            with self._read_connection() as conn:
                return conn.execute(
                    """
                    select
                        id::text,
                        area,
                        status,
                        trigger,
                        started_at,
                        finished_at
                    from app_core.tenant_update_runs
                    where client_id = %s::uuid
                      and area = %s
                      and status = 'success'
                    order by started_at desc
                    limit 1
                    """,
                    (client_id, area),
                ).fetchone()

        return await self._run(operation)

    async def delete_run(self, client_id: str, run_id: str) -> None:
        def operation() -> None:
            with self._connect() as conn, conn.transaction():
                conn.execute(
                    """
                    delete from app_core.tenant_update_runs
                    where id = %s::uuid and client_id = %s::uuid
                    """,
                    (run_id, client_id),
                )

        await self._run(operation)
