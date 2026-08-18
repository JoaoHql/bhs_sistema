import asyncio
from collections.abc import Callable
from datetime import date
from typing import Any, Protocol, TypeVar

import psycopg
from psycopg.rows import dict_row
from psycopg_pool import PoolTimeout, TooManyRequests

from app.core.db import get_connection_pool, readonly_connection
from app.core.errors import BadRequestError, NotFoundError, ServiceUnavailableError
from app.repositories.query_builder import QuerySpec, quote_identifier

T = TypeVar("T")


class QueryRepositoryProtocol(Protocol):
    async def get_data_source(self, client_slug: str, data_source_id: str) -> dict[str, Any] | None: ...
    async def resolve_tenant_schema(self, client_slug: str) -> str: ...
    async def validate_tenant_schema(self, schema_name: str) -> bool: ...
    async def get_validated_tenant_schema(self, client_slug: str) -> str: ...
    async def has_sales_projection_data(self, schema_name: str) -> bool: ...
    async def fetch_rows(self, spec: QuerySpec) -> list[dict[str, Any]]: ...
    async def fetch_sales_orders(self, schema_name: str, limit: int) -> list[dict[str, Any]]: ...
    async def fetch_combo_products(self, schema_name: str, search: str, company: str | None, limit: int) -> list[dict[str, Any]]: ...
    async def fetch_combo_companies(self, schema_name: str) -> list[str]: ...
    async def fetch_sales_projection(
        self,
        schema_name: str,
        month: str | None,
        company: str | None,
        quantity_growth_pct: float,
        revenue_growth_pct: float,
        goal_growth_pct: float,
    ) -> dict[str, Any]: ...
    async def fetch_sales_projection_weekly(
        self,
        schema_name: str,
        month: str | None,
        company: str | None,
        quantity_growth_pct: float,
        revenue_growth_pct: float,
        goal_growth_pct: float,
    ) -> dict[str, Any]: ...

    async def fetch_sales_projection_matrix(
        self,
        schema_name: str,
        month: str | None,
        company: str | None,
        quantity_growth_pct: float,
        revenue_growth_pct: float,
        goal_growth_pct: float,
    ) -> dict[str, Any]: ...


class QueryRepository:
    def __init__(self, database_url: str) -> None:
        self.database_url = database_url
        self.pool = get_connection_pool(database_url)

    async def _run(self, operation: Callable[[], T]) -> T:
        try:
            return await asyncio.to_thread(operation)
        except (PoolTimeout, TooManyRequests) as exc:
            raise ServiceUnavailableError("Banco temporariamente ocupado. Tente novamente em instantes.") from exc

    def _connect(self) -> psycopg.Connection:
        return self.pool.connection()

    def _read_connection(self):
        return readonly_connection(self.pool)

    async def get_data_source(self, client_slug: str, data_source_id: str) -> dict[str, Any] | None:
        def operation() -> dict[str, Any] | None:
            with self._read_connection() as conn:
                return conn.execute(
                    """
                    select ds.key, ds.kind, ds.entity, ds.allowed_fields, ds.allowed_filters
                    from app_core.data_sources ds
                    join app_core.clients c on c.id = ds.client_id
                    where c.slug = %s
                      and (ds.key = %s or ds.id::text = %s)
                      and ds.active = true
                      and c.status = 'active'
                    """,
                    (client_slug, data_source_id, data_source_id),
                ).fetchone()

        return await self._run(operation)

    async def resolve_tenant_schema(self, client_slug: str) -> str:
        def operation() -> str | None:
            with self._read_connection() as conn:
                row = conn.execute("select app_core.resolve_tenant_schema(%s) as schema_name", (client_slug,)).fetchone()
            return None if row is None else row["schema_name"]

        schema_name = await self._run(operation)
        if schema_name is None:
            raise NotFoundError("Tenant schema nao encontrado.")
        return schema_name

    async def validate_tenant_schema(self, schema_name: str) -> bool:
        def operation() -> bool:
            with self._read_connection() as conn:
                row = conn.execute("select app_core.validate_tenant_schema(%s::name) as valid", (schema_name,)).fetchone()
            return bool(row and row["valid"])

        return await self._run(operation)

    async def get_validated_tenant_schema(self, client_slug: str) -> str:
        schema_name = await self.resolve_tenant_schema(client_slug)
        if not await self.validate_tenant_schema(schema_name):
            raise BadRequestError("Tenant schema invalido.")
        return schema_name

    async def has_sales_projection_data(self, schema_name: str) -> bool:
        quoted_schema = quote_identifier(schema_name, tenant_schema=True)

        def operation() -> bool:
            with self._read_connection() as conn:
                row = conn.execute(
                    f"select to_regclass(%s) = '{quoted_schema}.projecao_vendas_diaria'::regclass as valid",
                    (f"{schema_name}.projecao_vendas_diaria",),
                ).fetchone()
            return bool(row and row["valid"])

        return await self._run(operation)

    async def fetch_rows(self, spec: QuerySpec) -> list[dict[str, Any]]:
        def operation() -> list[dict[str, Any]]:
            with self._read_connection() as conn:
                return conn.execute(spec.sql, spec.params).fetchall()

        try:
            return await self._run(operation)
        except psycopg.Error as exc:
            raise BadRequestError("Consulta invalida para fonte publicada.") from exc

    async def fetch_sales_orders(self, schema_name: str, limit: int) -> list[dict[str, Any]]:
        if limit < 1 or limit > 500:
            raise BadRequestError("Limit invalido.")

        quoted_schema = quote_identifier(schema_name, tenant_schema=True)

        def operation() -> list[dict[str, Any]]:
            with self._read_connection() as conn:
                return conn.execute(
                    f"""
                    select
                      order_date::text as order_date,
                      channel,
                      branch,
                      customer_name,
                      revenue::float8 as revenue,
                      orders_count::int as orders_count
                    from {quoted_schema}.sales_orders
                    order by order_date
                    limit %s
                    """,
                    (limit,),
                ).fetchall()

        try:
            return await self._run(operation)
        except psycopg.Error as exc:
            raise BadRequestError("Consulta invalida para pedidos de venda.") from exc

    async def fetch_combo_products(
        self,
        schema_name: str,
        search: str,
        company: str | None,
        limit: int,
    ) -> list[dict[str, Any]]:
        if limit < 1 or limit > 100:
            raise BadRequestError("Limit invalido.")

        quoted_schema = quote_identifier(schema_name, tenant_schema=True)
        where_parts = ["p.ativo = true", "p.preco_01 is not null"]
        params: list[Any] = []

        if company:
            where_parts.append("p.empresa = %s")
            params.append(company)
        if search.strip():
            where_parts.append("concat_ws(' ', p.codigo, p.descricao, p.descricao_resumida, p.empresa) ilike %s")
            params.append(f"%{search.strip()}%")
        params.append(limit)

        def operation() -> list[dict[str, Any]]:
            with self._read_connection() as conn:
                # Se MV existe, le diretamente dela (ja inclui unit_cost pre-computado)
                mv_relation = conn.execute(
                    f"select to_regclass('{quoted_schema}.mv_catalogo_custos') is not null as exists"
                ).fetchone()
                if mv_relation and mv_relation["exists"]:
                    sql = f"""
                    select
                      p.produto_id as product_id,
                      p.empresa as company,
                      p.codigo as code,
                      p.descricao as description,
                      p.unidade as unit,
                      p.preco_01::float8 as unit_price,
                      p.unit_cost::float8 as unit_cost
                    from {quoted_schema}.mv_catalogo_custos p
                    where {' and '.join(where_parts)}
                    order by (p.unit_cost is null), p.descricao, p.codigo, p.empresa
                    limit %s
                    """
                    return conn.execute(sql, tuple(params)).fetchall()

                # Fallback: consulta ao vivo de simulador_produtos + compprod (legado)
                relation_row = conn.execute(
                    """
                    select coalesce(
                      to_regclass(%s),
                      to_regclass(%s)
                    )::text as relation_name
                    """,
                    (f"{schema_name}.simulador_produtos", f"{schema_name}.vw_simulador_produtos"),
                ).fetchone()
                if not relation_row or not relation_row["relation_name"]:
                    raise BadRequestError("Catalogo de produtos indisponivel para este tenant.")
                relation_name = relation_row["relation_name"].split(".")[-1].strip('"')
                quoted_relation = quote_identifier(relation_name)
                has_compprod = conn.execute(
                    f"select to_regclass('{quoted_schema}.compprod') is not null as exists"
                ).fetchone()["exists"]

                if has_compprod:
                    sql = f"""
                    select
                      p.produto_id as product_id,
                      p.empresa as company,
                      p.codigo as code,
                      p.descricao as description,
                      p.unidade as unit,
                      p.preco_01::float8 as unit_price,
                      (p.preco_custo + coalesce(comp.custo_calculado, 0))::float8 as unit_cost
                    from {quoted_schema}.{quoted_relation} p
                    left join (
                      select
                        cp.produto_id,
                        cp.empresa,
                        sum(cp.qtd * pp.preco_custo) as custo_calculado
                      from {quoted_schema}.compprod cp
                      join {quoted_schema}.simulador_produtos pp
                        on pp.produto_id = cp.produto_usado_id
                        and pp.empresa = cp.empresa
                      group by cp.produto_id, cp.empresa
                    ) comp on comp.produto_id = p.produto_id and comp.empresa = p.empresa
                    where {' and '.join(where_parts)}
                    order by ((p.preco_custo + coalesce(comp.custo_calculado, 0)) is null), p.descricao, p.codigo, p.empresa
                    limit %s
                    """
                else:
                    sql = f"""
                    select
                      p.produto_id as product_id,
                      p.empresa as company,
                      p.codigo as code,
                      p.descricao as description,
                      p.unidade as unit,
                      p.preco_01::float8 as unit_price,
                      p.preco_custo::float8 as unit_cost
                    from {quoted_schema}.{quoted_relation} p
                    where {' and '.join(where_parts)}
                    order by (p.preco_custo is null), p.descricao, p.codigo, p.empresa
                    limit %s
                    """

                return conn.execute(sql, tuple(params)).fetchall()

        try:
            return await self._run(operation)
        except psycopg.Error as exc:
            raise BadRequestError("Consulta invalida para catalogo de produtos.") from exc

    async def fetch_combo_companies(self, schema_name: str) -> list[str]:
        quoted_schema = quote_identifier(schema_name, tenant_schema=True)

        def operation() -> list[str]:
            with self._read_connection() as conn:
                rows = conn.execute(
                    f"select distinct empresa from {quoted_schema}.produtos where ativo = true order by empresa"
                ).fetchall()
            return [row["empresa"] for row in rows]

        try:
            return await self._run(operation)
        except psycopg.Error as exc:
            raise BadRequestError("Consulta invalida para empresas do catalogo.") from exc

    async def fetch_sales_projection(
        self,
        schema_name: str,
        month: str | None,
        company: str | None,
        quantity_growth_pct: float,
        revenue_growth_pct: float,
        goal_growth_pct: float,
    ) -> dict[str, Any]:
        quoted_schema = quote_identifier(schema_name, tenant_schema=True)

        def operation() -> dict[str, Any]:
            with self._read_connection() as conn:
                available_months = conn.execute(
                    f"""
                    select to_char(date_trunc('month', data_venda), 'YYYY-MM') as value
                    from {quoted_schema}.projecao_vendas_diaria
                    group by 1 order by 1 desc
                    """
                ).fetchall()
                if not available_months:
                    return {"month": None, "companies": [], "rows": []}

                selected_month = month if month in {row["value"] for row in available_months} else available_months[0]["value"]
                companies = conn.execute(
                    f"select distinct empresa from {quoted_schema}.projecao_vendas_diaria order by empresa"
                ).fetchall()

                has_mv = conn.execute(
                    f"select to_regclass('{quoted_schema}.mv_vendas_diarias_resumo') is not null as exists"
                ).fetchone()["exists"]
                has_base_mv = conn.execute(
                    f"select to_regclass('{quoted_schema}.mv_projecao_bases') is not null as exists"
                ).fetchone()["exists"]

                if has_mv:
                    # previous_weekdays_scores: usa mv_projecao_bases se existir,
                    # senao computa ao vivo de projecao_vendas_diaria (fallback).
                    if has_base_mv:
                        weekdays_scores_cte = f"""
                        previous_weekdays_scores as (
                          select dia_semana as dow,
                                 sum(quantidade_media) as quantity_average,
                                 sum(receita_media)    as revenue_average
                          from {quoted_schema}.mv_projecao_bases
                          where mes_referencia = to_char(to_date(%s || '-01', 'YYYY-MM-DD') - interval '1 month', 'YYYY-MM')
                            and (%s::text is null or empresa = %s::text)
                          group by dia_semana
                        )"""
                        weekdays_scores_params = (selected_month, company, company)
                    else:
                        weekdays_scores_cte = f"""
                        previous_weekdays_agg as (
                          select extract(isodow from p.data_venda) as dow,
                                 p.data_venda,
                                 sum(p.quantidade_vendida)::numeric(20,4) as qty,
                                 sum(p.valor_faturado)::numeric(20,4) as revenue,
                                 row_number() over (partition by extract(isodow from p.data_venda) order by p.data_venda desc) as rn
                          from {quoted_schema}.projecao_vendas_diaria p
                          where p.data_venda < to_date(%s || '-01', 'YYYY-MM-DD')
                            and (%s::text is null or p.empresa = %s::text)
                          group by p.data_venda
                        ),
                        previous_weekdays_scores as (
                          select dow,
                                 avg(qty) filter (where rn <= 4) as quantity_average,
                                 avg(revenue) filter (where rn <= 4) as revenue_average
                          from previous_weekdays_agg
                          group by dow
                        )"""
                        weekdays_scores_params = (selected_month, company, company)

                    sql = f"""
                    with dates as (
                      select generate_series(
                        to_date(%s || '-01', 'YYYY-MM-DD'),
                        (to_date(%s || '-01', 'YYYY-MM-DD') + interval '1 month - 1 day')::date,
                        interval '1 day'
                      )::date as data_venda
                    ),
                    current_day as (
                      select p.data_venda,
                             sum(p.quantidade_vendida)::bigint as quantidade_vendida,
                             sum(p.valor_faturado)::numeric(20,4) as valor_faturado
                      from {quoted_schema}.mv_vendas_diarias_resumo p
                      where p.data_venda >= to_date(%s || '-01', 'YYYY-MM-DD')
                        and p.data_venda < to_date(%s || '-01', 'YYYY-MM-DD') + interval '1 month'
                        and (%s::text is null or p.empresa = %s::text)
                      group by p.data_venda
                    ),
                    previous_year as (
                      select p.data_venda,
                             sum(p.valor_faturado)::numeric(20,4) as valor_faturado
                      from {quoted_schema}.mv_vendas_diarias_resumo p
                      where p.data_venda >= to_date(%s || '-01', 'YYYY-MM-DD') - interval '1 year'
                        and p.data_venda < to_date(%s || '-01', 'YYYY-MM-DD') + interval '1 month - 1 year'
                        and (%s::text is null or p.empresa = %s::text)
                      group by p.data_venda
                    ),
                    {weekdays_scores_cte}
                    select
                      d.data_venda::text as sales_date,
                      coalesce(c.quantidade_vendida, 0)::int as quantity_sold,
                      round(pw.quantity_average * (1 + %s / 100.0))::int as quantity_projected,
                      case when pw.quantity_average * (1 + %s / 100.0) > 0
                        then coalesce(c.quantidade_vendida, 0) / (pw.quantity_average * (1 + %s / 100.0))
                      end::float8 as quantity_completion_pct,
                      coalesce(c.valor_faturado, 0)::float8 as revenue,
                      (pw.revenue_average * (1 + %s / 100.0))::float8 as revenue_projected,
                      case when pw.revenue_average * (1 + %s / 100.0) > 0
                        then coalesce(c.valor_faturado, 0) / (pw.revenue_average * (1 + %s / 100.0))
                      end::float8 as revenue_completion_pct,
                      case when py.valor_faturado is not null
                        then (py.valor_faturado * (1 + %s / 100.0))::float8
                      end as goal,
                      case when py.valor_faturado * (1 + %s / 100.0) > 0
                        then coalesce(c.valor_faturado, 0) / (py.valor_faturado * (1 + %s / 100.0))
                      end::float8 as goal_completion_pct
                    from dates d
                    left join current_day c on c.data_venda = d.data_venda
                    left join previous_year py on py.data_venda = (d.data_venda - interval '1 year')::date
                    left join previous_weekdays_scores pw on pw.dow = extract(isodow from d.data_venda)
                    order by d.data_venda
                    """
                    params = (
                        selected_month, selected_month,
                        selected_month, selected_month, company, company,
                        selected_month, selected_month, company, company,
                        *weekdays_scores_params,
                        quantity_growth_pct, quantity_growth_pct, quantity_growth_pct,
                        revenue_growth_pct, revenue_growth_pct, revenue_growth_pct,
                        goal_growth_pct, goal_growth_pct, goal_growth_pct,
                    )
                else:
                    # Fallback: consulta original sem MVs
                    sql = f"""
                    with dates as (
                      select generate_series(
                        to_date(%s || '-01', 'YYYY-MM-DD'),
                        (to_date(%s || '-01', 'YYYY-MM-DD') + interval '1 month - 1 day')::date,
                        interval '1 day'
                      )::date as data_venda
                    ),
                    current_day as (
                      select p.data_venda,
                             sum(p.quantidade_vendida)::bigint as quantidade_vendida,
                             sum(p.valor_faturado)::numeric(20,4) as valor_faturado
                      from {quoted_schema}.projecao_vendas_diaria p
                      where p.data_venda >= to_date(%s || '-01', 'YYYY-MM-DD')
                        and p.data_venda < to_date(%s || '-01', 'YYYY-MM-DD') + interval '1 month'
                        and (%s::text is null or p.empresa = %s::text)
                      group by p.data_venda
                    ),
                    previous_year as (
                      select p.data_venda,
                             sum(p.valor_faturado)::numeric(20,4) as valor_faturado
                      from {quoted_schema}.projecao_vendas_diaria p
                      where p.data_venda >= to_date(%s || '-01', 'YYYY-MM-DD') - interval '1 year'
                        and p.data_venda < to_date(%s || '-01', 'YYYY-MM-DD') + interval '1 month - 1 year'
                        and (%s::text is null or p.empresa = %s::text)
                      group by p.data_venda
                    ),
                    previous_weekdays_agg as (
                      select extract(isodow from p.data_venda) as dow,
                             p.data_venda,
                             sum(p.quantidade_vendida)::numeric(20,4) as qty,
                             sum(p.valor_faturado)::numeric(20,4) as revenue,
                             row_number() over (partition by extract(isodow from p.data_venda) order by p.data_venda desc) as rn
                      from {quoted_schema}.projecao_vendas_diaria p
                      where p.data_venda < to_date(%s || '-01', 'YYYY-MM-DD')
                        and (%s::text is null or p.empresa = %s::text)
                      group by p.data_venda
                    ),
                    previous_weekdays_scores as (
                      select dow,
                             avg(qty) filter (where rn <= 4) as quantity_average,
                             avg(revenue) filter (where rn <= 4) as revenue_average
                      from previous_weekdays_agg
                      group by dow
                    )
                    select
                      d.data_venda::text as sales_date,
                      coalesce(c.quantidade_vendida, 0)::int as quantity_sold,
                      round(pw.quantity_average * (1 + %s / 100.0))::int as quantity_projected,
                      case when pw.quantity_average * (1 + %s / 100.0) > 0
                        then coalesce(c.quantidade_vendida, 0) / (pw.quantity_average * (1 + %s / 100.0))
                      end::float8 as quantity_completion_pct,
                      coalesce(c.valor_faturado, 0)::float8 as revenue,
                      (pw.revenue_average * (1 + %s / 100.0))::float8 as revenue_projected,
                      case when pw.revenue_average * (1 + %s / 100.0) > 0
                        then coalesce(c.valor_faturado, 0) / (pw.revenue_average * (1 + %s / 100.0))
                      end::float8 as revenue_completion_pct,
                      case when py.valor_faturado is not null
                        then (py.valor_faturado * (1 + %s / 100.0))::float8
                      end as goal,
                      case when py.valor_faturado * (1 + %s / 100.0) > 0
                        then coalesce(c.valor_faturado, 0) / (py.valor_faturado * (1 + %s / 100.0))
                      end::float8 as goal_completion_pct
                    from dates d
                    left join current_day c on c.data_venda = d.data_venda
                    left join previous_year py on py.data_venda = (d.data_venda - interval '1 year')::date
                    left join previous_weekdays_scores pw on pw.dow = extract(isodow from d.data_venda)
                    order by d.data_venda
                    """
                    params = (
                        selected_month, selected_month,
                        selected_month, selected_month, company, company,
                        selected_month, selected_month, company, company,
                        selected_month, company, company,
                        quantity_growth_pct, quantity_growth_pct, quantity_growth_pct,
                        revenue_growth_pct, revenue_growth_pct, revenue_growth_pct,
                        goal_growth_pct, goal_growth_pct, goal_growth_pct,
                    )

                rows = conn.execute(sql, params).fetchall()
                if len(rows) != len({row["sales_date"] for row in rows}):
                    merged: dict[str, dict[str, object]] = {}
                    for row in rows:
                        key = row["sales_date"]
                        prev = merged.get(key)
                        if prev is None:
                            merged[key] = dict(row)
                        else:
                            merged[key] = {
                                **row,
                                "quantity_sold": int((prev.get("quantity_sold") or 0) + (row.get("quantity_sold") or 0)),
                                "revenue": float((prev.get("revenue") or 0) + (row.get("revenue") or 0)),
                            }
                    rows = [merged[k] for k in sorted(merged.keys())]
            return {
                "month": selected_month,
                "months": [row["value"] for row in available_months],
                "companies": [row["empresa"] for row in companies],
                "rows": rows,
            }

        try:
            return await self._run(operation)
        except psycopg.Error as exc:
            raise BadRequestError("Consulta invalida para projecao de vendas.") from exc

    async def fetch_sales_projection_weekly(
        self,
        schema_name: str,
        month: str | None,
        company: str | None,
        quantity_growth_pct: float,
        revenue_growth_pct: float,
        goal_growth_pct: float,
    ) -> dict[str, Any]:
        """Reutiliza a tabela diária e acrescenta agregações opcionais da base detalhada."""
        base = await self.fetch_sales_projection(
            schema_name=schema_name,
            month=month,
            company=company,
            quantity_growth_pct=quantity_growth_pct,
            revenue_growth_pct=revenue_growth_pct,
            goal_growth_pct=goal_growth_pct,
        )
        selected_month = base.get("month")
        if not selected_month:
            return {
                **base,
                "year": None,
                "years": [],
                "groupTotals": [],
                "productTotals": [],
                "attendantTotals": [],
                "monthlySeries": [],
                "weeklyRows": [],
            }

        try:
            analytics = await self._run(
                lambda: self._fetch_sales_projection_weekly_analytics(
                    schema_name=schema_name,
                    selected_month=selected_month,
                    company=company,
                    goal_growth_pct=goal_growth_pct,
                )
            )
        except (psycopg.Error, ServiceUnavailableError):
            # A base detalhada opcional nunca pode bloquear a tabela diária.
            year = int(selected_month[:4])
            analytics = {
                "year": year,
                "years": sorted({int(value[:4]) for value in base.get("months", [])}, reverse=True),
                "groupTotals": [],
                "productTotals": [],
                "attendantTotals": [],
                "monthlySeries": [
                    {"month": f"{year:04d}-{month_number:02d}", "total": 0.0, "goal": None}
                    for month_number in range(1, 13)
                ],
            }

        try:
            weekly_rows = await self._run(
                lambda: self._fetch_sales_projection_weekly_rows(
                    schema_name=schema_name,
                    selected_month=selected_month,
                    company=company,
                    quantity_growth_pct=quantity_growth_pct,
                    revenue_growth_pct=revenue_growth_pct,
                    goal_growth_pct=goal_growth_pct,
                    daily_rows=base.get("rows", []),
                )
            )
        except (psycopg.Error, ServiceUnavailableError):
            # A semente semanal e opcional: falha nunca bloqueia a tela.
            weekly_rows = []
        return {**base, **analytics, "weeklyRows": weekly_rows}

    def _fetch_sales_projection_weekly_rows(
        self,
        *,
        schema_name: str,
        selected_month: str,
        company: str | None,
        quantity_growth_pct: float,
        revenue_growth_pct: float,
        goal_growth_pct: float,
        daily_rows: list[dict[str, Any]],
    ) -> list[dict[str, Any]]:
        """Calcula as semanas do mes selecionado com semente semanal (SBM).

        Cada semana (dias 1-7, 8-14, 15-21, 22-28, 29+) tem a projecao calculada
        pela media da MESMA posicao de semana nos 4 meses anteriores completos,
        aplicando o cenario de crescimento. Nao soma projecoes diarias, evitando
        a duplicacao da formula diaria dentro da semana.
        """
        quoted_schema = quote_identifier(schema_name, tenant_schema=True)
        selected_date = date.fromisoformat(f"{selected_month}-01")
        if selected_date.month == 12:
            next_month = date(selected_date.year + 1, 1, 1)
        else:
            next_month = date(selected_date.year, selected_date.month + 1, 1)

        seed_start = selected_date
        for _ in range(4):
            seed_start = (
                date(seed_start.year - 1, 12, 1)
                if seed_start.month == 1
                else date(seed_start.year, seed_start.month - 1, 1)
            )

        with self._read_connection() as conn:
            seed_rows = conn.execute(
                f"""
                select
                  to_char(date_trunc('month', data_venda), 'YYYY-MM') as month,
                  ((extract(day from data_venda)::int - 1) / 7)::int + 1 as week_position,
                  sum(quantidade_vendida)::numeric(20,4) as quantity,
                  sum(valor_faturado)::numeric(20,4) as revenue
                from {quoted_schema}.projecao_vendas_diaria
                where data_venda >= %s
                  and data_venda < %s
                  and (%s::text is null or empresa = %s::text)
                group by 1, 2
                """,
                (seed_start, selected_date, company, company),
            ).fetchall()

        week_count = ((next_month - selected_date).days + 6) // 7
        seeds_by_position: dict[int, list[dict[str, Any]]] = {}
        for row in seed_rows:
            seeds_by_position.setdefault(int(row["week_position"]), []).append(row)

        weeks: list[dict[str, Any]] = []
        for position in range(1, week_count + 1):
            start_day = (position - 1) * 7 + 1
            end_day = min(position * 7, (next_month - selected_date).days)
            week_days = [
                row
                for row in daily_rows
                if start_day <= int(row["sales_date"][-2:]) <= end_day
            ]

            quantity_sold = sum(float(row.get("quantity_sold") or 0) for row in week_days)
            revenue = sum(float(row.get("revenue") or 0) for row in week_days)

            goal_days = [row for row in week_days if row.get("goal") is not None]
            goal = sum(float(row["goal"]) for row in goal_days) if goal_days else None
            revenue_comparable_to_goal = sum(float(row.get("revenue") or 0) for row in goal_days)

            seeds = seeds_by_position.get(position, [])
            if seeds:
                quantity_projected = (
                    sum(float(s["quantity"]) for s in seeds) / len(seeds)
                ) * (1 + quantity_growth_pct / 100.0)
                revenue_projected = (
                    sum(float(s["revenue"]) for s in seeds) / len(seeds)
                ) * (1 + revenue_growth_pct / 100.0)
            else:
                quantity_projected = None
                revenue_projected = None

            weeks.append({
                "week": position,
                "quantity_sold": round(quantity_sold, 4),
                "quantity_projected": round(quantity_projected, 4) if quantity_projected is not None else None,
                "quantity_completion_pct": (
                    round(quantity_sold / quantity_projected, 6)
                    if quantity_projected
                    else None
                ),
                "revenue": round(revenue, 4),
                "revenue_projected": round(revenue_projected, 4) if revenue_projected is not None else None,
                "revenue_completion_pct": (
                    round(revenue / revenue_projected, 6)
                    if revenue_projected
                    else None
                ),
                "goal": round(goal, 4) if goal is not None else None,
                "goal_completion_pct": (
                    round(revenue_comparable_to_goal / goal, 6)
                    if goal
                    else None
                ),
            })
        return weeks

    def _fetch_sales_projection_weekly_analytics(
        self,
        *,
        schema_name: str,
        selected_month: str,
        company: str | None,
        goal_growth_pct: float,
    ) -> dict[str, Any]:
        quoted_schema = quote_identifier(schema_name, tenant_schema=True)
        selected_date = date.fromisoformat(f"{selected_month}-01")
        year = selected_date.year
        next_year = date(year + 1, 1, 1)
        previous_year = date(year - 1, 1, 1)
        if selected_date.month == 12:
            next_month = date(year + 1, 1, 1)
        else:
            next_month = date(year, selected_date.month + 1, 1)

        def relation_exists(conn: psycopg.Connection, relation: str) -> bool:
            row = conn.execute(
                "select to_regclass(%s) is not null as exists",
                (f"{schema_name}.{relation}",),
            ).fetchone()
            return bool(row and row["exists"])

        def fallback_label(kind: str, entity_id: int) -> str:
            if entity_id == 0:
                return "Não informado"
            return f"{kind} #{entity_id}"

        def ranking(
            conn: psycopg.Connection,
            *,
            source_column: str,
            kind: str,
            relation: str,
            relation_id: str,
            relation_label: str,
        ) -> list[dict[str, Any]]:
            if not relation_exists(conn, "projecao_vendas_detalhada"):
                return []
            rows = conn.execute(
                f"""
                select
                  d.empresa as company,
                  d.{source_column}::int as entity_id,
                  sum(d.valor_faturado)::float8 as total
                from {quoted_schema}.projecao_vendas_detalhada d
                where d.data_venda >= %s
                  and d.data_venda < %s
                  and (%s::text is null or d.empresa = %s::text)
                group by d.empresa, d.{source_column}
                order by total desc, d.empresa, d.{source_column}
                """,
                (selected_date, next_month, company, company),
            ).fetchall()

            labels: dict[tuple[str, int], str] = {}
            if relation_exists(conn, relation):
                dimension_rows = conn.execute(
                    f"""
                    select empresa as company, {relation_id}::int as entity_id, {relation_label} as label
                    from {quoted_schema}.{relation}
                    where (%s::text is null or empresa = %s::text)
                    """,
                    (company, company),
                ).fetchall()
                labels = {
                    (row["company"], int(row["entity_id"])): str(row["label"]).strip()
                    for row in dimension_rows
                    if row["label"] is not None and str(row["label"]).strip()
                }

            return [
                {
                    "id": int(row["entity_id"]),
                    "company": row["company"],
                    "label": labels.get(
                        (row["company"], int(row["entity_id"])),
                        fallback_label(kind, int(row["entity_id"])),
                    ),
                    "total": float(row["total"] or 0),
                }
                for row in rows
            ]

        with self._read_connection() as conn:
            years = [
                int(row["year"])
                for row in conn.execute(
                    f"""
                    select extract(year from data_venda)::int as year
                    from {quoted_schema}.projecao_vendas_diaria
                    group by 1
                    order by 1 desc
                    """
                ).fetchall()
            ]

            monthly_total_rows: list[dict[str, Any]] = []
            if relation_exists(conn, "projecao_vendas_detalhada"):
                monthly_total_rows = conn.execute(
                    f"""
                    select
                      to_char(date_trunc('month', d.data_venda), 'YYYY-MM') as month,
                      sum(d.valor_faturado)::float8 as total
                    from {quoted_schema}.projecao_vendas_detalhada d
                    where d.data_venda >= %s
                      and d.data_venda < %s
                      and (%s::text is null or d.empresa = %s::text)
                    group by 1
                    """,
                    (date(year, 1, 1), next_year, company, company),
                ).fetchall()

            goal_rows = conn.execute(
                f"""
                select
                  to_char(date_trunc('month', p.data_venda) + interval '1 year', 'YYYY-MM') as month,
                  (sum(p.valor_faturado) * (1 + %s / 100.0))::float8 as goal
                from {quoted_schema}.projecao_vendas_diaria p
                where p.data_venda >= %s
                  and p.data_venda < %s
                  and (%s::text is null or p.empresa = %s::text)
                group by 1
                """,
                (goal_growth_pct, previous_year, date(year, 1, 1), company, company),
            ).fetchall()

            totals_by_month = {row["month"]: float(row["total"] or 0) for row in monthly_total_rows}
            goals_by_month = {row["month"]: float(row["goal"]) for row in goal_rows}
            monthly_series = [
                {
                    "month": f"{year:04d}-{month_number:02d}",
                    "total": totals_by_month.get(f"{year:04d}-{month_number:02d}", 0.0),
                    "goal": goals_by_month.get(f"{year:04d}-{month_number:02d}"),
                }
                for month_number in range(1, 13)
            ]

            return {
                "year": year,
                "years": years,
                "groupTotals": ranking(
                    conn,
                    source_column="grupo_id",
                    kind="Grupo",
                    relation="dim_grupos",
                    relation_id="grupo_id",
                    relation_label="nome",
                ),
                "productTotals": ranking(
                    conn,
                    source_column="produto_id",
                    kind="Produto",
                    relation="produtos",
                    relation_id="produto_id",
                    relation_label="descricao",
                ),
                "attendantTotals": ranking(
                    conn,
                    source_column="atendente_id",
                    kind="Atendente",
                    relation="dim_atendentes",
                    relation_id="atendente_id",
                    relation_label="nome",
                ),
                "monthlySeries": monthly_series,
            }

    async def fetch_sales_projection_matrix(
        self,
        schema_name: str,
        month: str | None,
        company: str | None,
        quantity_growth_pct: float,
        revenue_growth_pct: float,
        goal_growth_pct: float,
    ) -> dict[str, Any]:
        """Matriz 4 níveis Data→Grupo→Produto→Atendente com projeção por célula (SBM filtrado)."""
        base = await self.fetch_sales_projection(
            schema_name=schema_name,
            month=month,
            company=company,
            quantity_growth_pct=quantity_growth_pct,
            revenue_growth_pct=revenue_growth_pct,
            goal_growth_pct=goal_growth_pct,
        )
        selected_month = base.get("month")
        if not selected_month:
            return {
                **base,
                "year": None,
                "years": [],
                "groupTotals": [],
                "productTotals": [],
                "attendantTotals": [],
                "monthlySeries": [],
                "matrixRows": [],
            }

        try:
            analytics = await self._run(
                lambda: self._fetch_sales_projection_weekly_analytics(
                    schema_name=schema_name,
                    selected_month=selected_month,
                    company=company,
                    goal_growth_pct=goal_growth_pct,
                )
            )
        except (psycopg.Error, ServiceUnavailableError):
            year = int(selected_month[:4])
            analytics = {
                "year": year,
                "years": sorted({int(value[:4]) for value in base.get("months", [])}, reverse=True),
                "groupTotals": [],
                "productTotals": [],
                "attendantTotals": [],
                "monthlySeries": [
                    {"month": f"{year:04d}-{month_number:02d}", "total": 0.0, "goal": None}
                    for month_number in range(1, 13)
                ],
            }

        try:
            matrix_rows = await self._run(
                lambda: self._fetch_sales_projection_matrix(
                    schema_name=schema_name,
                    selected_month=selected_month,
                    company=company,
                    quantity_growth_pct=quantity_growth_pct,
                    revenue_growth_pct=revenue_growth_pct,
                    goal_growth_pct=goal_growth_pct,
                )
            )
        except (psycopg.Error, ServiceUnavailableError):
            matrix_rows = []

        return {**base, **analytics, "matrixRows": matrix_rows}

    def _fetch_sales_projection_matrix(
        self,
        *,
        schema_name: str,
        selected_month: str,
        company: str | None,
        quantity_growth_pct: float,
        revenue_growth_pct: float,
        goal_growth_pct: float,
    ) -> list[dict[str, Any]]:
        """Matriz diária: Data(dia) → Grupo → Produto → Atendente com SBM filtrado por isodow e por tupla.

        - Realizado: sum por data_venda + dimensões no mês selecionado.
        - Projeção SBM: para cada (data, tupla) projeta avg dos últimos 4 mesmos isodow da tupla * (1+growth).
        - Goal: sum do mesmo dia no ano anterior por tupla * (1+goal_growth).
        """
        quoted_schema = quote_identifier(schema_name, tenant_schema=True)
        selected_date = date.fromisoformat(f"{selected_month}-01")
        if selected_date.month == 12:
            next_month = date(selected_date.year + 1, 1, 1)
        else:
            next_month = date(selected_date.year, selected_date.month + 1, 1)

        goal_start = date(selected_date.year - 1, selected_date.month, 1)
        if selected_date.month == 12:
            goal_end = date(selected_date.year, 1, 1)
        else:
            goal_end = date(selected_date.year - 1, selected_date.month + 1, 1)

        def relation_exists(conn: psycopg.Connection, relation: str) -> bool:
            row = conn.execute(
                "select to_regclass(%s) is not null as exists",
                (f"{schema_name}.{relation}",),
            ).fetchone()
            return bool(row and row["exists"])

        with self._read_connection() as conn:
            if not relation_exists(conn, "projecao_vendas_detalhada"):
                return []

            # Realizado diário por Data + dimensões no mês selecionado
            current_rows = conn.execute(
                f"""
                select
                  data_venda::text as sales_date,
                  extract(isodow from data_venda)::int as dow,
                  grupo_id::int as grupo_id,
                  produto_id::int as produto_id,
                  atendente_id::int as atendente_id,
                  sum(quantidade_vendida)::numeric(20,4) as quantity_sold,
                  sum(valor_faturado)::numeric(20,4) as revenue
                from {quoted_schema}.projecao_vendas_detalhada
                where data_venda >= %s and data_venda < %s
                  and (%s::text is null or empresa = %s::text)
                group by data_venda, dow, grupo_id, produto_id, atendente_id
                """,
                (selected_date, next_month, company, company),
            ).fetchall()

            # Semente SBM diária: últimos 60 dias por tupla + dow, para avg últimos 4 mesmos isodow
            # Busca raw por dia+tupla com dow, depois avg em Python (rn <=4)
            raw_seed_rows = conn.execute(
                f"""
                select
                  data_venda::text as sales_date,
                  extract(isodow from data_venda)::int as dow,
                  grupo_id::int as grupo_id,
                  produto_id::int as produto_id,
                  atendente_id::int as atendente_id,
                  sum(quantidade_vendida)::numeric(20,4) as quantity,
                  sum(valor_faturado)::numeric(20,4) as revenue,
                  data_venda as sort_date
                from {quoted_schema}.projecao_vendas_detalhada
                where data_venda >= %s and data_venda < %s
                  and (%s::text is null or empresa = %s::text)
                group by data_venda, dow, grupo_id, produto_id, atendente_id
                order by grupo_id, produto_id, atendente_id, dow, data_venda desc
                """,
                (date.fromisoformat(f"{selected_month}-01") - __import__("datetime").timedelta(days=60), selected_date, company, company),
            ).fetchall()

            # Goal diário: mesmo dia no ano anterior por tupla
            goal_rows = conn.execute(
                f"""
                select
                  data_venda::text as sales_date,
                  grupo_id::int as grupo_id,
                  produto_id::int as produto_id,
                  atendente_id::int as atendente_id,
                  sum(valor_faturado)::numeric(20,4) as goal_base
                from {quoted_schema}.projecao_vendas_detalhada
                where data_venda >= %s and data_venda < %s
                  and (%s::text is null or empresa = %s::text)
                group by data_venda, grupo_id, produto_id, atendente_id
                """,
                (goal_start, goal_end, company, company),
            ).fetchall()

            # Labels
            grupo_labels: dict[tuple[str, int], str] = {}
            produto_labels: dict[tuple[str, int], str] = {}
            atendente_labels: dict[tuple[str, int], str] = {}
            if relation_exists(conn, "dim_grupos"):
                for row in conn.execute(
                    f"select empresa as company, grupo_id::int as entity_id, nome as label from {quoted_schema}.dim_grupos where (%s::text is null or empresa = %s::text)",
                    (company, company),
                ).fetchall():
                    if row["label"] and str(row["label"]).strip():
                        grupo_labels[(row["company"], int(row["entity_id"]))] = str(row["label"]).strip()
            if relation_exists(conn, "dim_atendentes"):
                for row in conn.execute(
                    f"select empresa as company, atendente_id::int as entity_id, nome as label from {quoted_schema}.dim_atendentes where (%s::text is null or empresa = %s::text)",
                    (company, company),
                ).fetchall():
                    if row["label"] and str(row["label"]).strip():
                        atendente_labels[(row["company"], int(row["entity_id"]))] = str(row["label"]).strip()
            if relation_exists(conn, "produtos"):
                for row in conn.execute(
                    f"select empresa as company, produto_id::int as entity_id, descricao as label from {quoted_schema}.produtos where (%s::text is null or empresa = %s::text)",
                    (company, company),
                ).fetchall():
                    if row["label"] and str(row["label"]).strip():
                        produto_labels[(row["company"], int(row["entity_id"]))] = str(row["label"]).strip()

        fallback_company = company or ""

        def label_for(kind: str, entity_id: int, labels: dict[tuple[str, int], str]) -> str:
            if entity_id == 0:
                return "Não informado"
            key = (fallback_company, entity_id) if fallback_company else None
            if key and key in labels:
                return labels[key]
            for (comp, eid), lab in labels.items():
                if eid == entity_id:
                    return lab
            return f"{kind} #{entity_id}"

        # Index current por chave (sales_date, grupo, produto, atendente)
        current_by_key: dict[tuple[str, int, int, int], dict[str, Any]] = {}
        current_dow_by_key: dict[tuple[str, int, int, int], int] = {}
        for r in current_rows:
            key = (str(r["sales_date"]), int(r["grupo_id"]), int(r["produto_id"]), int(r["atendente_id"]))
            current_by_key[key] = r
            current_dow_by_key[key] = int(r["dow"])

        # Seed: agrupar por (dow, grupo, produto, atendente) -> lista ordenada por data desc, pegar até 4
        from collections import defaultdict
        seed_bucket: dict[tuple[int, int, int, int], list[dict[str, Any]]] = defaultdict(list)
        for r in raw_seed_rows:
            key = (int(r["dow"]), int(r["grupo_id"]), int(r["produto_id"]), int(r["atendente_id"]))
            seed_bucket[key].append(r)
        # Para cada tupla, manter só 4 mais recentes já ordenadas desc
        for k in list(seed_bucket.keys()):
            seed_bucket[k] = seed_bucket[k][:4]

        # Goal por (sales_date_prev_year, grupo, produto, atendente)
        goal_by_key: dict[tuple[str, int, int, int], float] = {}
        for r in goal_rows:
            key = (str(r["sales_date"]), int(r["grupo_id"]), int(r["produto_id"]), int(r["atendente_id"]))
            goal_by_key[key] = float(r["goal_base"] or 0)

        # Construir todas as chaves do mês (current + possíveis seeds/goals para completude)
        # Para linhas sem vendido no dia mas com projeção, ainda geramos linha com quantity_sold=0
        # Então all_keys = current keys + para cada current key, garantir que seed/goal sejam considerados
        all_keys = set(current_by_key.keys())
        # Adicionar também chaves que só têm seed/goal mas não current? Para matriz diária por dia,
        # só mostramos dias do mês selecionado; então não precisamos adicionar chaves fora do mês.
        # Mas mantemos current como fonte de datas.

        result: list[dict[str, Any]] = []
        for key in sorted(all_keys):
            sales_date, grupo_id, produto_id, atendente_id = key
            cur = current_by_key[key]
            dow = current_dow_by_key[key]
            quantity_sold = float(cur["quantity_sold"] or 0)
            revenue = float(cur["revenue"] or 0)

            seed_key = (dow, grupo_id, produto_id, atendente_id)
            seeds = seed_bucket.get(seed_key, [])
            if seeds:
                quantity_projected = (sum(float(s["quantity"]) for s in seeds) / len(seeds)) * (1 + quantity_growth_pct / 100.0)
                revenue_projected = (sum(float(s["revenue"]) for s in seeds) / len(seeds)) * (1 + revenue_growth_pct / 100.0)
            else:
                quantity_projected = None
                revenue_projected = None

            # Goal: mesmo dia no ano anterior
            try:
                cur_date = date.fromisoformat(sales_date)
                goal_date_str = date(cur_date.year - 1, cur_date.month, cur_date.day).isoformat()
            except ValueError:
                goal_date_str = ""
            goal_base = goal_by_key.get((goal_date_str, grupo_id, produto_id, atendente_id))
            goal = (goal_base * (1 + goal_growth_pct / 100.0)) if goal_base is not None else None

            empresa_label = fallback_company
            result.append({
                "sales_date": sales_date,
                "week": dow,
                "grupo_id": grupo_id,
                "produto_id": produto_id,
                "atendente_id": atendente_id,
                "grupo_label": label_for("Grupo", grupo_id, grupo_labels),
                "produto_label": label_for("Produto", produto_id, produto_labels),
                "atendente_label": label_for("Atendente", atendente_id, atendente_labels),
                "company": empresa_label,
                "quantity_sold": round(quantity_sold, 4),
                "quantity_projected": round(quantity_projected, 4) if quantity_projected is not None else None,
                "quantity_completion_pct": round(quantity_sold / quantity_projected, 6) if quantity_projected else None,
                "revenue": round(revenue, 4),
                "revenue_projected": round(revenue_projected, 4) if revenue_projected is not None else None,
                "revenue_completion_pct": round(revenue / revenue_projected, 6) if revenue_projected else None,
                "goal": round(goal, 4) if goal is not None else None,
                "goal_completion_pct": round(revenue / goal, 6) if goal else None,
            })

        if len(result) > 5000:
            result = sorted(result, key=lambda x: x["revenue"], reverse=True)[:5000]

        result.sort(key=lambda x: (x["sales_date"], x["grupo_label"], x["produto_label"], x["atendente_label"]))
        return result
