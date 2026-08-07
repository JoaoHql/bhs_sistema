from typing import Any

import pytest

from app.core.errors import BadRequestError, NotFoundError
from app.repositories.query_builder import QuerySpec, build_query_spec
from app.schemas.client import Client
from app.schemas.query import QueryRequest
from app.schemas.screen import Screen
from app.schemas.user import User
from app.services.permission_service import PermissionService
from app.services.query_service import QueryService


def make_screen(widget_id: str = "wid-receita-canal") -> Screen:
    return Screen.model_validate(
        {
            "id": "demo-vendas",
            "moduleId": "demo-vendas",
            "label": "Demo Vendas",
            "layout": "dashboard",
            "filters": [],
            "components": [
                {
                    "id": widget_id,
                    "type": "chart",
                    "title": "Receita por canal",
                    "gridSpan": 2,
                    "dataSourceId": "vendas",
                    "chartConfig": {
                        "id": "chart-receita-canal",
                        "workspaceId": "vendas",
                        "type": "bar",
                        "title": "Receita por canal",
                        "description": "Teste",
                        "dimensions": [{"field": "channel", "label": "Canal"}],
                        "metrics": [{"field": "revenue", "label": "Receita", "aggregation": "sum", "format": "currency"}],
                    },
                }
            ],
        }
    )


class ConfigRepo:
    def __init__(self) -> None:
        self.clients = {"bhs-demo": Client(id="cli_bhs", slug="bhs-demo", name="BHS Demo", status="active")}

    async def get_current_user(self, email: str | None = None, client_slug: str | None = None) -> User:
        _ = email, client_slug
        return User(id="usr", email="admin@bhs.demo", name="Admin", client_id="cli_bhs", roles=["admin"], allowed_screen_ids=["*"])

    async def get_screen(self, client_id: str, screen_id: str) -> Screen | None:
        _ = client_id
        return make_screen() if screen_id == "demo-vendas" else None

    async def get_client_by_slug(self, client_slug: str) -> Client | None:
        return self.clients.get(client_slug)


class QueryRepo:
    def __init__(self) -> None:
        self.last_spec: QuerySpec | None = None

    async def get_data_source(self, client_slug: str, data_source_id: str) -> dict[str, Any] | None:
        if client_slug != "bhs-demo" or data_source_id != "vendas":
            return None
        return {
            "key": "vendas",
            "kind": "tenant_view",
            "entity": "vw_sales_summary",
            "allowed_fields": ["channel", "revenue", "orders_count"],
            "allowed_filters": ["channel"],
        }

    async def resolve_tenant_schema(self, client_slug: str) -> str:
        return f"tenant_{client_slug.replace('-', '_')}"

    async def validate_tenant_schema(self, schema_name: str) -> bool:
        return schema_name == "tenant_bhs_demo"

    async def fetch_rows(self, spec: QuerySpec) -> list[dict[str, Any]]:
        self.last_spec = spec
        return [{"channel": "Online", "Receita": 18000}]


def test_query_builder_rejects_unallowed_filter() -> None:
    with pytest.raises(BadRequestError):
        build_query_spec(
            schema_name="tenant_bhs_demo",
            entity="vw_sales_summary",
            dimensions=["channel"],
            metrics=[("revenue", "Receita", "sum")],
            filters={"branch": "Salvador"},
            allowed_fields={"channel", "revenue"},
            allowed_filters={"channel"},
            limit=100,
        )


def test_query_builder_rejects_bad_identifier() -> None:
    with pytest.raises(BadRequestError):
        build_query_spec(
            schema_name="tenant_bhs_demo;drop",
            entity="vw_sales_summary",
            dimensions=["channel"],
            metrics=[("revenue", "Receita", "sum")],
            filters={},
            allowed_fields={"channel", "revenue"},
            allowed_filters={"channel"},
            limit=100,
        )


@pytest.mark.anyio
async def test_query_service_returns_chart_rows() -> None:
    config_repo = ConfigRepo()
    query_repo = QueryRepo()
    service = QueryService(config_repository=config_repo, query_repository=query_repo, permission_service=PermissionService())
    user = await config_repo.get_current_user(client_slug="bhs-demo")

    response = await service.execute(
        request=QueryRequest.model_validate({"screenId": "demo-vendas", "widgetId": "wid-receita-canal", "filters": {"channel": "Online"}}),
        user=user,
        client_slug="bhs-demo",
    )

    assert response.rows == [{"channel": "Online", "Receita": 18000}]
    assert response.metadata.applied_filters == ["channel"]
    assert query_repo.last_spec is not None
    assert "tenant_bhs_demo" in query_repo.last_spec.sql


@pytest.mark.anyio
async def test_query_service_blocks_missing_cross_client_source() -> None:
    config_repo = ConfigRepo()
    service = QueryService(config_repository=config_repo, query_repository=QueryRepo(), permission_service=PermissionService())
    user = await config_repo.get_current_user(client_slug="bhs-demo")

    with pytest.raises(NotFoundError):
        await service.execute(
            request=QueryRequest.model_validate({"screenId": "demo-vendas", "widgetId": "wid-receita-canal", "filters": {}}),
            user=user,
            client_slug="acme-demo",
        )
