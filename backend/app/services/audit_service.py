import asyncio
from typing import Any
import psycopg
from psycopg.rows import dict_row
from psycopg.types.json import Jsonb
from app.core.db import get_connection_pool


SENSITIVE_METADATA_KEYS = frozenset({"password", "password_hash", "token", "access_token", "authorization"})
_pending_audit_tasks: set[asyncio.Task[None]] = set()


def sanitize_metadata(metadata: dict[str, Any] | None) -> dict[str, Any]:
    """Remove credenciais antes de persistir eventos de auditoria."""
    def clean(value: Any) -> Any:
        if isinstance(value, dict):
            return {key: "[redacted]" if key.lower() in SENSITIVE_METADATA_KEYS else clean(item) for key, item in value.items()}
        if isinstance(value, list):
            return [clean(item) for item in value]
        return value

    return clean(metadata or {})


class AuditService:
    def __init__(self, database_url: str) -> None:
        self.database_url = database_url
        self.pool = get_connection_pool(database_url) if database_url and "dummy" not in database_url else None

    async def log_action(
        self,
        *,
        actor_id: str | None,
        client_id: str | None,
        action: str,
        resource_type: str | None = None,
        resource_id: str | None = None,
        status: str,
        metadata: dict[str, Any] | None = None,
    ) -> None:
        if not self.database_url or "dummy" in self.database_url:
            # Em modo mock/testes locais simples sem banco, ignorar gravação em banco
            return

        def operation() -> None:
            if self.pool is None:
                return
            with self.pool.connection() as conn:
                conn.execute(
                    """
                    insert into app_core.audit_logs (
                        actor_id, client_id, action, resource_type, resource_id, status, metadata
                    ) values (
                        case when %s::uuid is null then null else %s::uuid end,
                        case when %s::uuid is null then null else %s::uuid end,
                        %s,
                        %s,
                        %s,
                        %s,
                        %s::jsonb
                    )
                    """,
                    (
                        actor_id,
                        actor_id,
                        client_id,
                        client_id,
                        action,
                        resource_type,
                        resource_id,
                        status,
                        Jsonb(sanitize_metadata(metadata)),
                    ),
                )
        try:
            await asyncio.to_thread(operation)
        except Exception:
            # Não quebrar a requisição se falhar ao auditar, mas logar o erro
            import logging
            logging.getLogger("bhs_app").error('{"message": "Falha ao gravar log de auditoria no banco de dados"}')

    def log_action_later(self, **kwargs: Any) -> None:
        """Agenda auditoria de sucesso sem prolongar a resposta HTTP."""
        async def delayed_log() -> None:
            await asyncio.sleep(0.05)
            await self.log_action(**kwargs)

        task = asyncio.create_task(delayed_log())
        _pending_audit_tasks.add(task)
        task.add_done_callback(_pending_audit_tasks.discard)
