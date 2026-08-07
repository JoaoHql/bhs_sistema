import asyncio
from collections.abc import Callable
from typing import TypeVar

import psycopg
from psycopg.rows import dict_row

from app.repositories.query_builder import quote_identifier

T = TypeVar("T")


class MaterializationRepository:
    def __init__(self, database_url: str) -> None:
        self.database_url = database_url

    async def _run(self, operation: Callable[[], T]) -> T:
        return await asyncio.to_thread(operation)

    async def refresh_materialized_view(self, schema_name: str, view_name: str) -> int:
        quoted_schema = quote_identifier(schema_name, tenant_schema=True)
        view_identifier = quote_identifier(view_name)

        def operation() -> int:
            # Conexao raw com autocommit obrigatorio para REFRESH CONCURRENTLY
            # (o pool entrega conexao com transacao pendente, o que impede
            #  setar autocommit — por isso abrimos uma conexao separada).
            with psycopg.connect(self.database_url, autocommit=True) as conn:
                conn.execute(
                    f"refresh materialized view concurrently {quoted_schema}.{view_identifier}"
                )
                row = conn.execute(
                    f"select count(*) as cnt from {quoted_schema}.{view_identifier}"
                ).fetchone()
                return row[0] if row else 0

        return await self._run(operation)
