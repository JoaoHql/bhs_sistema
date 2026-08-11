# Escalabilidade de dados: Materialized Views + Cache + Paginação

## Objetivo

Substituir leitura ao vivo de tabelas pesadas por **Materialized Views** (PostgreSQL nativo) + **cache Redis 24h** + **paginação no banco**, com refresh manual via painel Configurações.

---

## Arquitetura (visão geral)

```
Frontend → GET queries  → QueryService → Redis (24h) → QueryRepository → MVs (Supabase)
         → POST refresh → UpdateService → MaterializationService → REFRESH CONCURRENTLY
                       → Invalida Redis
                       → Registra app_core.tenant_update_runs
```

- **3 MVs** (tenant_gelobel): vendas resumo, projeção bases, catálogo custos.
- **1 tabela** (app_core): histórico de execuções de refresh.
- **1 painel** (Configurações > Dados): status + refresh manual + histórico.
- ⚠️ `mv_sales_orders` foi **removida do escopo** — `tenant_gelobel` não tem tabela `sales_orders` (é requisito opcional).

---

# ✅ FASE 1 — Banco de Dados (Migrations)

| Arquivo | Status |
|---|---|
| `supabase/migrations/20260807100000_core_update_runs.sql` | ✅ |
| `supabase/migrations/20260807110000_gelobel_materialized_views.sql` | ✅ |

---

# ✅ FASE 2 — Repositories e Services (Backend)

| Arquivo | Status |
|---|---|
| `backend/app/repositories/update_repository.py` | ✅ |
| `backend/app/repositories/materialization_repository.py` | ✅ |
| `backend/app/services/materialization_service.py` | ✅ |
| `backend/app/services/update_service.py` | ✅ |
| `backend/app/schemas/update.py` | ✅ |
| `backend/app/dependencies/redis.py` (rate_limit_updates) | ✅ |
| `backend/app/dependencies/services.py` (factories) | ✅ |

---

# ✅ FASE 3 — API Endpoints e Cache Redis

| Arquivo | Status |
|---|---|
| `backend/app/repositories/query_repository.py` (MVs + fallback) | ✅ |
| `backend/app/api/v1/endpoints/query.py` (cache Redis 24h) | ✅ |
| `backend/app/api/v1/endpoints/updates.py` | ✅ |
| `backend/app/api/v1/router.py` (registro) | ✅ |

---

# ✅ FASE 4 — Frontend (Painel Atualizações)

| Arquivo | Status |
|---|---|
| `src/types/index.ts` (tipos) | ✅ |
| `src/services/updatesApi.ts` | ✅ |
| `src/features/configuracoes/components/UpdatesPanel.tsx` | ✅ |
| `src/features/configuracoes/views/ConfiguracoesView.tsx` (3ª aba) | ✅ |

---

## Critérios de sucesso (todas as fases)

1. ✅ **Autocommit**: `MaterializationRepository._connect_autocommit()` resolve transaction block no REFRESH CONCURRENTLY.
2. ✅ **Projeção com ano anterior**: `fetch_sales_projection` usa `mv_vendas_diarias_resumo` nos CTEs `current_day`/`previous_year`.
3. ✅ **Catálogo**: `mv_catalogo_custos` mantém `descricao_resumida`, `ativo`, `preco_custo`, `unit_cost`.
4. ✅ **Fallback**: `to_regclass` em `fetch_combo_products` e `fetch_sales_projection` — deploy sem downtime.
5. ✅ **Redis**: `invalidate_prefix("bhs:cache:tenant:{slug}:query:")` no `UpdateService.refresh_data` + TTL 86400s.

---

## Validação final

| Check | Resultado |
|---|---|
| `python -m compileall app` | ✅ 100% limpo |
| `python -m pytest` (backend) | ✅ 129 passed (5 falhos pré-existentes) |
| `npx tsc --noEmit` (frontend) | ✅ 0 erros |
