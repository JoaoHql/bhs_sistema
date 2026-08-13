import asyncio
from collections.abc import Callable
from datetime import datetime, timezone
from typing import Any, Protocol, TypeVar
from uuid import uuid4

from psycopg.types.json import Jsonb

from app.core.db import get_connection_pool, readonly_connection
from app.core.errors import NotFoundError
from app.repositories.query_builder import quote_identifier
from app.schemas.combo_simulation import ComboSimulationCreate

T = TypeVar("T")


class ComboSimulationRepositoryProtocol(Protocol):
    async def list_for_user(self, *, tenant_schema: str, client_id: str, user_id: str, company: str) -> list[dict[str, Any]]: ...
    async def create_for_user(self, *, tenant_schema: str, client_id: str, user_id: str, data: ComboSimulationCreate) -> dict[str, Any]: ...
    async def delete_for_user(self, *, tenant_schema: str, client_id: str, user_id: str, company: str, simulation_id: str) -> None: ...


class ComboSimulationRepository:
    def __init__(self, database_url: str) -> None:
        self.pool = get_connection_pool(database_url)

    async def _run(self, operation: Callable[[], T]) -> T:
        return await asyncio.to_thread(operation)

    async def list_for_user(self, *, tenant_schema: str, client_id: str, user_id: str, company: str) -> list[dict[str, Any]]:
        quoted_schema = quote_identifier(tenant_schema, tenant_schema=True)

        def operation() -> list[dict[str, Any]]:
            with readonly_connection(self.pool) as conn:
                return conn.execute(
                    f"""
                    select id::text, name, created_at, products
                    from {quoted_schema}.combo_simulacoes
                    where client_id = %s::uuid and created_by = %s::uuid and company = %s
                    order by created_at desc, id desc
                    limit 500
                    """,
                    (client_id, user_id, company),
                ).fetchall()

        return await self._run(operation)

    async def create_for_user(self, *, tenant_schema: str, client_id: str, user_id: str, data: ComboSimulationCreate) -> dict[str, Any]:
        quoted_schema = quote_identifier(tenant_schema, tenant_schema=True)

        def operation() -> dict[str, Any]:
            with self.pool.connection() as conn, conn.transaction():
                row = conn.execute(
                    f"""
                    insert into {quoted_schema}.combo_simulacoes (client_id, created_by, company, name, products)
                    values (%s::uuid, %s::uuid, %s, %s, %s)
                    returning id::text, name, created_at, products
                    """,
                    (client_id, user_id, data.company.strip(), data.name.strip(), Jsonb([product.model_dump(by_alias=True) for product in data.products])),
                ).fetchone()
            return row

        return await self._run(operation)

    async def delete_for_user(self, *, tenant_schema: str, client_id: str, user_id: str, company: str, simulation_id: str) -> None:
        quoted_schema = quote_identifier(tenant_schema, tenant_schema=True)

        def operation() -> None:
            with self.pool.connection() as conn, conn.transaction():
                deleted = conn.execute(
                    f"""
                    delete from {quoted_schema}.combo_simulacoes
                    where id = %s::uuid and client_id = %s::uuid and created_by = %s::uuid and company = %s
                    returning id
                    """,
                    (simulation_id, client_id, user_id, company),
                ).fetchone()
                if deleted is None:
                    raise NotFoundError("Cenario salvo nao encontrado.")

        await self._run(operation)


class MockComboSimulationRepository:
    _records: dict[str, dict[str, Any]] = {}

    @classmethod
    def reset(cls) -> None:
        cls._records = {}

    async def list_for_user(self, *, tenant_schema: str, client_id: str, user_id: str, company: str) -> list[dict[str, Any]]:
        _ = tenant_schema
        rows = [
            row for row in self._records.values()
            if row["client_id"] == client_id and row["created_by"] == user_id and row["company"] == company
        ]
        return sorted(rows, key=lambda row: (row["created_at"], row["id"]), reverse=True)

    async def create_for_user(self, *, tenant_schema: str, client_id: str, user_id: str, data: ComboSimulationCreate) -> dict[str, Any]:
        _ = tenant_schema
        row = {
            "id": str(uuid4()),
            "client_id": client_id,
            "created_by": user_id,
            "company": data.company.strip(),
            "name": data.name.strip(),
            "created_at": datetime.now(timezone.utc),
            "products": [product.model_dump(by_alias=True) for product in data.products],
        }
        self._records[row["id"]] = row
        return row

    async def delete_for_user(self, *, tenant_schema: str, client_id: str, user_id: str, company: str, simulation_id: str) -> None:
        _ = tenant_schema
        row = self._records.get(simulation_id)
        if row is None or row["client_id"] != client_id or row["created_by"] != user_id or row["company"] != company:
            raise NotFoundError("Cenario salvo nao encontrado.")
        del self._records[simulation_id]
