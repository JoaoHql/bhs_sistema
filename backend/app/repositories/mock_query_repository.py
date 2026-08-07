from typing import Any

from app.repositories.query_builder import QuerySpec


class MockQueryRepository:
    async def get_data_source(self, client_slug: str, data_source_id: str) -> dict[str, Any] | None:
        if client_slug != "bhs-demo" or data_source_id != "ws-vendas-demo":
            return None
        return {
            "key": "ws-vendas-demo",
            "kind": "tenant_table",
            "entity": "vendas",
            "allowed_fields": ["canal", "receita", "pedidos"],
            "allowed_filters": ["canal"],
        }

    async def resolve_tenant_schema(self, client_slug: str) -> str:
        return f"tenant_{client_slug.replace('-', '_')}"

    async def validate_tenant_schema(self, schema_name: str) -> bool:
        return schema_name in ("tenant_bhs_demo", "tenant_gelobel")

    async def get_validated_tenant_schema(self, client_slug: str) -> str:
        return f"tenant_{client_slug.replace('-', '_')}"

    async def has_sales_projection_data(self, schema_name: str) -> bool:
        return schema_name.startswith("tenant_")

    async def fetch_rows(self, spec: QuerySpec) -> list[dict[str, Any]]:
        _ = spec
        return [{"canal": "Online", "Receita": 18000.0}]

    async def fetch_sales_orders(self, schema_name: str, limit: int) -> list[dict[str, Any]]:
        _ = (schema_name, limit)
        return [
            {
                "order_date": "2026-06-15",
                "channel": "Online",
                "branch": "Filial Salvador",
                "customer_name": "Cliente Alpha",
                "revenue": 18000.0,
                "orders_count": 4,
            },
            {
                "order_date": "2026-06-20",
                "channel": "Atacado",
                "branch": "Filial Feira",
                "customer_name": "Cliente Beta",
                "revenue": 12500.0,
                "orders_count": 2,
            },
        ]

    async def fetch_combo_products(self, schema_name: str, search: str, company: str | None, limit: int) -> list[dict[str, Any]]:
        _ = (schema_name, limit)
        rows = [
            {"product_id": 1, "company": "Demo", "code": "001", "description": "Produto Demonstracao A", "unit": "Un", "unit_cost": 10.0, "unit_price": 16.0},
            {"product_id": 2, "company": "Demo", "code": "002", "description": "Produto Demonstracao B", "unit": "Un", "unit_cost": 18.0, "unit_price": 28.0},
            {"product_id": 3, "company": "Demo", "code": "003", "description": "Produto Demonstracao C", "unit": "Un", "unit_cost": 25.0, "unit_price": 40.0},
        ]
        normalized_search = search.lower().strip()
        return [
            row
            for row in rows
            if row["company"] == company
            and (not normalized_search or normalized_search in f"{row['code']} {row['description']}".lower())
        ]

    async def fetch_combo_companies(self, schema_name: str) -> list[str]:
        _ = schema_name
        return ["Demo"]

    async def fetch_sales_projection(self, schema_name: str, month: str | None, company: str | None, quantity_growth_pct: float, revenue_growth_pct: float, goal_growth_pct: float) -> dict[str, Any]:
        _ = (schema_name, month, company, quantity_growth_pct, revenue_growth_pct, goal_growth_pct)
        return {"month": "2026-06", "months": ["2026-06"], "companies": ["Demo"], "rows": []}
