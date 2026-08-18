from app.repositories.materialization_repository import MaterializationRepository

# Mapeamento de areas para as views materializadas de cada tenant.
_AREA_TO_VIEW: dict[str, str] = {
    "vendas": "mv_vendas_diarias_resumo",
    "projecao": "mv_projecao_bases",
    "catalogo": "mv_catalogo_custos",
    "matriz": "mv_projecao_matriz_mensal",
}


class MaterializationService:
    def __init__(self, repository: MaterializationRepository) -> None:
        self.repository = repository

    async def materialize_area(self, schema_name: str, area: str) -> int:
        view_name = _AREA_TO_VIEW[area]
        return await self.repository.refresh_materialized_view(schema_name, view_name)

    async def materialize_all(self, schema_name: str, areas: list[str] | None = None) -> dict[str, int]:
        target_areas = areas or list(_AREA_TO_VIEW.keys())
        result: dict[str, int] = {}
        for area in target_areas:
            rows = await self.materialize_area(schema_name, area)
            result[area] = rows
        return result
