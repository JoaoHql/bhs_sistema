import asyncio
import hashlib
import json

from fastapi import APIRouter, Depends, Header
from pydantic import BaseModel, ConfigDict, Field

from app.dependencies.identity import get_current_user, resolve_tenant_for_request
from app.dependencies.redis import get_redis_service, rate_limit_query
from app.dependencies.services import get_query_service, get_repository, get_audit_service, get_query_repository
from app.repositories.config_repository_protocol import ConfigRepositoryProtocol
from app.repositories.query_repository import QueryRepositoryProtocol
from app.services.audit_service import AuditService
from app.services.redis_service import RedisService
from app.schemas.query import QueryRequest, QueryResponse
from app.schemas.user import User
from app.services.query_service import QueryService
from app.core.errors import ApiError
from app.schemas.client import Client

router = APIRouter(prefix="/query", dependencies=[Depends(rate_limit_query)])

CACHE_TTL_24H = 86400


def _query_cache_key(client_slug: str, endpoint: str, params: dict) -> str:
    raw = json.dumps(params, sort_keys=True, separators=(",", ":"))
    digest = hashlib.md5(raw.encode()).hexdigest()[:16]
    return f"bhs:cache:tenant:{client_slug}:query:{endpoint}:{digest}"


async def resolve_request_client(
    user: User,
    client_slug: str,
    repo: ConfigRepositoryProtocol,
) -> Client:
    if not user.is_staff and user.client_id and user.client_slug == client_slug:
        return Client(id=user.client_id, name=client_slug, slug=client_slug, status="active")
    client = await repo.get_client_by_slug(client_slug)
    if client is None:
        from app.core.errors import NotFoundError

        raise NotFoundError("Tenant nao encontrado.")
    return client


class SalesOverviewRequest(BaseModel):
    model_config = ConfigDict(extra="forbid", populate_by_name=True)

    screen_id: str = Field(alias="screenId")
    limit: int = Field(default=500, ge=1, le=500)


class SalesOverviewResponse(BaseModel):
    model_config = ConfigDict(extra="forbid", populate_by_name=True)

    screen_id: str = Field(alias="screenId")
    client_slug: str = Field(alias="clientSlug")
    rows: list[dict]


class ComboSimulatorProductsRequest(BaseModel):
    model_config = ConfigDict(extra="forbid", populate_by_name=True)

    screen_id: str = Field(alias="screenId")
    search: str = Field(default="", max_length=120)
    company: str | None = Field(default=None, max_length=120)
    limit: int = Field(default=60, ge=1, le=100)


class ComboSimulatorProductsResponse(BaseModel):
    model_config = ConfigDict(extra="forbid", populate_by_name=True)

    screen_id: str = Field(alias="screenId")
    client_slug: str = Field(alias="clientSlug")
    companies: list[str]
    rows: list[dict]


class SalesProjectionRequest(BaseModel):
    model_config = ConfigDict(extra="forbid", populate_by_name=True)

    screen_id: str = Field(alias="screenId")
    month: str | None = Field(default=None, pattern=r"^\d{4}-\d{2}$")
    company: str | None = Field(default=None, max_length=120)
    quantity_growth_pct: float = Field(default=0, alias="quantityGrowthPct", ge=-99.99, le=1000)
    revenue_growth_pct: float = Field(default=0, alias="revenueGrowthPct", ge=-99.99, le=1000)
    goal_growth_pct: float = Field(default=0, alias="goalGrowthPct", ge=-99.99, le=1000)


class SalesProjectionResponse(BaseModel):
    model_config = ConfigDict(extra="forbid", populate_by_name=True)

    screen_id: str = Field(alias="screenId")
    client_slug: str = Field(alias="clientSlug")
    month: str | None
    months: list[str]
    companies: list[str]
    rows: list[dict]


class SalesProjectionWeeklyRequest(SalesProjectionRequest):
    pass


class SalesProjectionWeeklyResponse(SalesProjectionResponse):
    year: int | None
    years: list[int]
    group_totals: list[dict] = Field(alias="groupTotals")
    product_totals: list[dict] = Field(alias="productTotals")
    attendant_totals: list[dict] = Field(alias="attendantTotals")
    monthly_series: list[dict] = Field(alias="monthlySeries")
    weekly_rows: list[dict] = Field(default_factory=list, alias="weeklyRows")


@router.post("", response_model=QueryResponse)
async def execute_query(
    request: QueryRequest,
    user: User = Depends(get_current_user),
    service: QueryService = Depends(get_query_service),
    repo: ConfigRepositoryProtocol = Depends(get_repository),
    audit: AuditService = Depends(get_audit_service),
    x_tenant_slug: str | None = Header(default=None, alias="X-Tenant-Slug"),
) -> QueryResponse:
    # Resolver o client_slug dinamicamente a partir do client_id do usuário autenticado
    client_slug = resolve_tenant_for_request(user, x_tenant_slug)
    client = await resolve_request_client(user, client_slug, repo)
    effective_user = user.model_copy(update={"client_id": client.id, "client_slug": client.slug})

    try:
        response = await service.execute(request=request, user=effective_user, client_slug=client_slug)
        audit.log_action_later(
            actor_id=user.id,
            client_id=client.id,
            action="query",
            resource_type="widget",
            resource_id=request.widget_id,
            status="success",
            metadata={"screen_id": request.screen_id, "filters": request.filters},
        )
        return response
    except ApiError as exc:
        await audit.log_action(
            actor_id=user.id,
            client_id=client.id,
            action="query",
            resource_type="widget",
            resource_id=request.widget_id,
            status="failed",
            metadata={"screen_id": request.screen_id, "filters": request.filters, "error": exc.message},
        )
        raise exc


@router.post("/sales-overview", response_model=SalesOverviewResponse)
async def sales_overview(
    request: SalesOverviewRequest,
    user: User = Depends(get_current_user),
    repo: ConfigRepositoryProtocol = Depends(get_repository),
    query_repo: QueryRepositoryProtocol = Depends(get_query_repository),
    audit: AuditService = Depends(get_audit_service),
    x_tenant_slug: str | None = Header(default=None, alias="X-Tenant-Slug"),
) -> SalesOverviewResponse:
    client_slug = resolve_tenant_for_request(user, x_tenant_slug)
    client = await resolve_request_client(user, client_slug, repo)

    try:
        screen, schema_name = await asyncio.gather(
            repo.get_screen(client.id, request.screen_id),
            query_repo.get_validated_tenant_schema(client_slug),
        )
        if screen is None:
            from app.core.errors import NotFoundError

            raise NotFoundError("Tela nao encontrada.")

        rows = await query_repo.fetch_sales_orders(schema_name=schema_name, limit=request.limit)
        audit.log_action_later(
            actor_id=user.id,
            client_id=client.id,
            action="query",
            resource_type="screen",
            resource_id=request.screen_id,
            status="success",
            metadata={"screen_id": request.screen_id, "template": "sales-overview"},
        )
        return SalesOverviewResponse(screenId=request.screen_id, clientSlug=client_slug, rows=rows)
    except ApiError as exc:
        await audit.log_action(
            actor_id=user.id,
            client_id=client.id,
            action="query",
            resource_type="screen",
            resource_id=request.screen_id,
            status="failed",
            metadata={"screen_id": request.screen_id, "template": "sales-overview", "error": exc.message},
        )
        raise exc


@router.post("/combo-simulator-products", response_model=ComboSimulatorProductsResponse)
async def combo_simulator_products(
    request: ComboSimulatorProductsRequest,
    user: User = Depends(get_current_user),
    repo: ConfigRepositoryProtocol = Depends(get_repository),
    query_repo: QueryRepositoryProtocol = Depends(get_query_repository),
    redis: RedisService = Depends(get_redis_service),
    audit: AuditService = Depends(get_audit_service),
    x_tenant_slug: str | None = Header(default=None, alias="X-Tenant-Slug"),
) -> ComboSimulatorProductsResponse:
    client_slug = resolve_tenant_for_request(user, x_tenant_slug)
    client = await resolve_request_client(user, client_slug, repo)

    cache_key = _query_cache_key(client_slug, "combo-simulator-products", {
        "search": request.search,
        "company": request.company,
        "limit": request.limit,
        "screenId": request.screen_id,
    })
    cached = await redis.get_json(cache_key)
    if cached is not None:
        return ComboSimulatorProductsResponse(**cached)

    try:
        screen, schema_name = await asyncio.gather(
            repo.get_screen(client.id, request.screen_id),
            query_repo.get_validated_tenant_schema(client_slug),
        )
        if screen is None:
            from app.core.errors import NotFoundError

            raise NotFoundError("Tela nao encontrada.")

        selected_company = request.company.strip() if request.company else None
        if selected_company:
            rows, companies = await asyncio.gather(
                query_repo.fetch_combo_products(
                    schema_name=schema_name,
                    search=request.search,
                    company=selected_company,
                    limit=request.limit,
                ),
                query_repo.fetch_combo_companies(schema_name=schema_name),
            )
            if selected_company not in companies:
                rows = []
            elif any(row.get("company") != selected_company for row in rows):
                from app.core.errors import BadRequestError

                raise BadRequestError("Catalogo de produtos retornou empresas diferentes da selecionada.")
        else:
            companies = await query_repo.fetch_combo_companies(schema_name=schema_name)
            rows = []
        audit.log_action_later(
            actor_id=user.id,
            client_id=client.id,
            action="query",
            resource_type="screen",
            resource_id=request.screen_id,
            status="success",
            metadata={
                "screen_id": request.screen_id,
                "template": "combo-simulator",
                "company": selected_company,
            },
        )
        response = ComboSimulatorProductsResponse(
            screenId=request.screen_id,
            clientSlug=client_slug,
            companies=companies,
            rows=rows,
        )
        await redis.set_json(cache_key, response.model_dump(by_alias=True), ttl_seconds=CACHE_TTL_24H)
        return response
    except ApiError as exc:
        await audit.log_action(
            actor_id=user.id,
            client_id=client.id,
            action="query",
            resource_type="screen",
            resource_id=request.screen_id,
            status="failed",
            metadata={"screen_id": request.screen_id, "template": "combo-simulator", "error": exc.message},
        )
        raise exc


@router.post("/sales-projection", response_model=SalesProjectionResponse)
async def sales_projection(
    request: SalesProjectionRequest,
    user: User = Depends(get_current_user),
    repo: ConfigRepositoryProtocol = Depends(get_repository),
    query_repo: QueryRepositoryProtocol = Depends(get_query_repository),
    redis: RedisService = Depends(get_redis_service),
    audit: AuditService = Depends(get_audit_service),
    x_tenant_slug: str | None = Header(default=None, alias="X-Tenant-Slug"),
) -> SalesProjectionResponse:
    client_slug = resolve_tenant_for_request(user, x_tenant_slug)
    client = await resolve_request_client(user, client_slug, repo)

    cache_key = _query_cache_key(client_slug, "sales-projection", {
        "month": request.month,
        "company": request.company,
        "quantityGrowthPct": request.quantity_growth_pct,
        "revenueGrowthPct": request.revenue_growth_pct,
        "goalGrowthPct": request.goal_growth_pct,
        "screenId": request.screen_id,
    })
    cached = await redis.get_json(cache_key)
    if cached is not None:
        return SalesProjectionResponse(**cached)

    try:
        screen, schema_name = await asyncio.gather(
            repo.get_screen(client.id, request.screen_id),
            query_repo.get_validated_tenant_schema(client_slug),
        )
        if screen is None:
            from app.core.errors import NotFoundError
            raise NotFoundError("Tela nao encontrada.")
        if not await query_repo.has_sales_projection_data(schema_name):
            from app.core.errors import BadRequestError
            raise BadRequestError("Base diária de projeção de vendas indisponível para este tenant.")
        result = await query_repo.fetch_sales_projection(
            schema_name=schema_name,
            month=request.month,
            company=request.company.strip() if request.company else None,
            quantity_growth_pct=request.quantity_growth_pct,
            revenue_growth_pct=request.revenue_growth_pct,
            goal_growth_pct=request.goal_growth_pct,
        )
        audit.log_action_later(
            actor_id=user.id, client_id=client.id, action="query", resource_type="screen", resource_id=request.screen_id,
            status="success", metadata={"template": "sales-projection", "month": result["month"]},
        )
        response = SalesProjectionResponse(screenId=request.screen_id, clientSlug=client_slug, **result)
        await redis.set_json(cache_key, response.model_dump(by_alias=True), ttl_seconds=CACHE_TTL_24H)
        return response
    except ApiError as exc:
        await audit.log_action(
            actor_id=user.id, client_id=client.id, action="query", resource_type="screen", resource_id=request.screen_id,
            status="failed", metadata={"template": "sales-projection", "error": exc.message},
        )
        raise exc


@router.post("/sales-projection-weekly", response_model=SalesProjectionWeeklyResponse)
async def sales_projection_weekly(
    request: SalesProjectionWeeklyRequest,
    user: User = Depends(get_current_user),
    repo: ConfigRepositoryProtocol = Depends(get_repository),
    query_repo: QueryRepositoryProtocol = Depends(get_query_repository),
    redis: RedisService = Depends(get_redis_service),
    audit: AuditService = Depends(get_audit_service),
    x_tenant_slug: str | None = Header(default=None, alias="X-Tenant-Slug"),
) -> SalesProjectionWeeklyResponse:
    client_slug = resolve_tenant_for_request(user, x_tenant_slug)
    client = await resolve_request_client(user, client_slug, repo)

    if request.screen_id != "projecao-semanal":
        from app.core.errors import NotFoundError
        raise NotFoundError("Tela nao encontrada.")

    cache_key = _query_cache_key(client_slug, "sales-projection-weekly", {
        "v": 2,
        "month": request.month,
        "company": request.company,
        "quantityGrowthPct": request.quantity_growth_pct,
        "revenueGrowthPct": request.revenue_growth_pct,
        "goalGrowthPct": request.goal_growth_pct,
        "screenId": request.screen_id,
    })
    cached = await redis.get_json(cache_key)
    if cached is not None:
        return SalesProjectionWeeklyResponse(**cached)

    try:
        screen, schema_name = await asyncio.gather(
            repo.get_screen(client.id, request.screen_id),
            query_repo.get_validated_tenant_schema(client_slug),
        )
        if screen is None:
            from app.core.errors import NotFoundError
            raise NotFoundError("Tela nao encontrada.")
        if not await query_repo.has_sales_projection_data(schema_name):
            from app.core.errors import BadRequestError
            raise BadRequestError("Base diaria de projecao de vendas indisponivel para este tenant.")
        result = await query_repo.fetch_sales_projection_weekly(
            schema_name=schema_name,
            month=request.month,
            company=request.company.strip() if request.company else None,
            quantity_growth_pct=request.quantity_growth_pct,
            revenue_growth_pct=request.revenue_growth_pct,
            goal_growth_pct=request.goal_growth_pct,
        )
        audit.log_action_later(
            actor_id=user.id,
            client_id=client.id,
            action="query",
            resource_type="screen",
            resource_id=request.screen_id,
            status="success",
            metadata={"template": "sales-projection-weekly", "month": result["month"]},
        )
        response = SalesProjectionWeeklyResponse(screenId=request.screen_id, clientSlug=client_slug, **result)
        await redis.set_json(cache_key, response.model_dump(by_alias=True), ttl_seconds=CACHE_TTL_24H)
        return response
    except ApiError as exc:
        await audit.log_action(
            actor_id=user.id,
            client_id=client.id,
            action="query",
            resource_type="screen",
            resource_id=request.screen_id,
            status="failed",
            metadata={"template": "sales-projection-weekly", "error": exc.message},
        )
        raise exc
