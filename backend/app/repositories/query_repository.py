import asyncio
from collections.abc import Callable
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
                                 quantidade_media as quantity_average,
                                 receita_media    as revenue_average
                          from {quoted_schema}.mv_projecao_bases
                          where mes_referencia = to_char(to_date(%s || '-01', 'YYYY-MM-DD') - interval '1 month', 'YYYY-MM')
                            and (%s::text is null or empresa = %s::text)
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
