from datetime import datetime, timezone

from app.core.errors import NotFoundError
from app.repositories.query_repository import QueryRepositoryProtocol
from app.repositories.update_repository import UpdateRepository
from app.schemas.update import AreaUpdateStatus, RefreshResponse, UpdateRun
from app.schemas.user import User
from app.services.audit_service import AuditService
from app.services.materialization_service import MaterializationService
from app.services.redis_service import RedisService


_AREAS_DEFINITION: list[dict[str, str]] = [
    {"area": "catalogo", "label": "Catalogo de Produtos"},
    {"area": "vendas", "label": "Vendas (Projecao Diaria)"},
    {"area": "projecao", "label": "Projecao de Vendas (Bases)"},
]


class UpdateService:
    def __init__(
        self,
        repository: UpdateRepository,
        query_repo: QueryRepositoryProtocol,
        redis_service: RedisService,
        materialization_service: MaterializationService,
        audit_service: AuditService,
    ) -> None:
        self.repository = repository
        self.query_repo = query_repo
        self.redis = redis_service
        self.materialization = materialization_service
        self.audit = audit_service

    async def get_updates_status(self, actor: User) -> list[AreaUpdateStatus]:
        schema_name = await self.query_repo.get_validated_tenant_schema(actor.client_slug)
        result: list[AreaUpdateStatus] = []

        for ad in _AREAS_DEFINITION:
            area = ad["area"]
            last_run = await self.repository.get_latest_success(str(actor.client_id), area)
            status = "stale"
            if last_run:
                status = "ok"

            result.append(
                AreaUpdateStatus(
                    area=area,
                    label=ad["label"],
                    last_updated_at=last_run["finished_at"] if last_run else None,
                    rows_count=last_run.get("rows_affected") if last_run else None,
                    status=status,  # type: ignore[arg-type]
                )
            )

        return result

    async def refresh_data(self, actor: User, area: str | None = None) -> RefreshResponse:
        if not actor.client_id or not actor.client_slug:
            raise NotFoundError("Tenant nao resolvido para o usuario autenticado.")

        schema_name = await self.query_repo.get_validated_tenant_schema(actor.client_slug)
        target_areas = [area] if area else [ad["area"] for ad in _AREAS_DEFINITION]

        runs: list[UpdateRun] = []
        for single_area in target_areas:
            run_id = await self.repository.record_run_start(
                str(actor.client_id), single_area, "manual"
            )
            rows_affected = None
            error_msg = None
            status = "success"

            try:
                rows_affected = await self.materialization.materialize_area(schema_name, single_area)
            except NotFoundError:
                error_msg = "Tenant schema nao encontrado."
                status = "failed"
            except Exception as exc:
                error_msg = str(exc)
                status = "failed"

            await self.repository.record_run_finish(
                run_id, status=status, rows_affected=rows_affected, error_message=error_msg
            )

            self.audit.log_action_later(
                actor_id=str(actor.id),
                client_id=str(actor.client_id),
                action="tenant.updates.run",
                resource_type="update_run",
                resource_id=run_id,
                status=status,
                metadata={"area": single_area, "rows_affected": rows_affected},
            )

            runs.append(
                UpdateRun(
                    id=run_id,
                    area=single_area,
                    status=status,
                    trigger="manual",
                    rows_affected=rows_affected,
                    error_message=error_msg,
                    started_at=datetime.now(tz=timezone.utc),
                    finished_at=datetime.now(tz=timezone.utc),
                )
            )

        if actor.client_slug:
            await self.redis.invalidate_prefix(f"bhs:cache:tenant:{actor.client_slug}:query:")

        statuses = await self.get_updates_status(actor)
        return RefreshResponse(run=runs[0], areas=statuses)

    async def list_runs(self, actor: User, limit: int = 50) -> list[UpdateRun]:
        if not actor.client_id:
            return []
        rows = await self.repository.list_recent_runs(str(actor.client_id), limit)
        return [
            UpdateRun(
                id=row["id"],
                area=row["area"],
                status=row["status"],
                trigger=row["trigger"],
                rows_affected=row.get("rows_affected"),
                error_message=row.get("error_message"),
                started_at=row["started_at"],
                finished_at=row.get("finished_at"),
            )
            for row in rows
        ]

    async def delete_run(self, actor: User, run_id: str) -> None:
        if not actor.client_id:
            return
        await self.repository.delete_run(str(actor.client_id), run_id)
