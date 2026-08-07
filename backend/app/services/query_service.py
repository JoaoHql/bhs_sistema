from typing import Any

from app.core.errors import BadRequestError, ForbiddenError, NotFoundError
from app.repositories.config_repository_protocol import ConfigRepositoryProtocol
from app.repositories.query_builder import build_query_spec
from app.repositories.query_repository import QueryRepositoryProtocol
from app.schemas.query import QueryRequest, QueryResponse
from app.schemas.user import User
from app.schemas.widget import Widget
from app.services.permission_service import PermissionService


class QueryService:
    def __init__(
        self,
        *,
        config_repository: ConfigRepositoryProtocol,
        query_repository: QueryRepositoryProtocol,
        permission_service: PermissionService,
    ) -> None:
        self.config_repository = config_repository
        self.query_repository = query_repository
        self.permission_service = permission_service

    async def execute(self, request: QueryRequest, user: User, client_slug: str) -> QueryResponse:
        screen = await self.config_repository.get_screen(user.client_id, request.screen_id)
        if screen is None:
            raise NotFoundError("Tela nao encontrada.")
        if not self.permission_service.can_read_screen(user, screen.id):
            raise ForbiddenError("Usuario sem permissao para consultar esta tela.")

        widget = next((item for item in screen.components if item.id == request.widget_id), None)
        if widget is None:
            raise NotFoundError("Widget nao encontrado.")
        if not widget.data_source_id:
            raise BadRequestError("Widget sem dataSourceId.")

        source = await self.query_repository.get_data_source(client_slug, widget.data_source_id)
        if source is None:
            raise NotFoundError("Fonte de dados nao encontrada.")

        schema_name = await self.query_repository.resolve_tenant_schema(client_slug)
        if not await self.query_repository.validate_tenant_schema(schema_name):
            raise BadRequestError("Tenant schema invalido.")

        allowed_fields = set(source["allowed_fields"])
        allowed_filters = set(source["allowed_filters"])
        spec = self._build_spec(
            widget=widget,
            schema_name=schema_name,
            entity=source["entity"],
            allowed_fields=allowed_fields,
            allowed_filters=allowed_filters,
            filters=request.filters,
            limit=request.limit,
        )
        rows = await self.query_repository.fetch_rows(spec)
        return QueryResponse(
            screen_id=screen.id,
            widget_id=widget.id,
            data_source_id=widget.data_source_id,
            kind=widget.type,
            rows=rows,
            metadata={
                "clientSlug": client_slug,
                "rowCount": len(rows),
                "appliedFilters": spec.applied_filters,
            },
        )

    def _build_spec(
        self,
        *,
        widget: Widget,
        schema_name: str,
        entity: str,
        allowed_fields: set[str],
        allowed_filters: set[str],
        filters: dict[str, Any],
        limit: int,
    ):
        if widget.type == "chart" and widget.chart_config:
            return build_query_spec(
                schema_name=schema_name,
                entity=entity,
                dimensions=[item.field for item in widget.chart_config.dimensions],
                metrics=[(item.field, item.label, item.aggregation) for item in widget.chart_config.metrics],
                filters=filters,
                allowed_fields=allowed_fields,
                allowed_filters=allowed_filters,
                limit=limit,
            )
        if widget.type == "kpi_card" and widget.kpi_config:
            return build_query_spec(
                schema_name=schema_name,
                entity=entity,
                dimensions=[],
                metrics=[(widget.kpi_config.field, widget.kpi_config.label, widget.kpi_config.aggregation)],
                filters=filters,
                allowed_fields=allowed_fields,
                allowed_filters=allowed_filters,
                limit=1,
            )
        if widget.type == "table" and widget.table_config:
            return build_query_spec(
                schema_name=schema_name,
                entity=entity,
                dimensions=[],
                metrics=[],
                table_fields=sorted(allowed_fields),
                filters=filters,
                allowed_fields=allowed_fields,
                allowed_filters=allowed_filters,
                limit=limit,
            )
        raise BadRequestError("Widget sem configuracao de consulta valida.")

