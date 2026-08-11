# Fase 1 — Execução: Migrations de Banco

**Data:** 2026-08-07

## Escopo executado

- **Plano base:** `plans/escalabilidade-atualizacoes-dados-supabase.md` (atualizado com fases e checklists)
- **Fase:** 1 de 4 — Banco de Dados (Migrations)

## Arquivos criados

| Arquivo | Descrição |
|---|---|
| `supabase/migrations/20260807100000_core_update_runs.sql` | Tabela `app_core.tenant_update_runs` — histórico de execuções de refresh por tenant. Colunas: id (uuid), client_id (FK), area, status (check: running/success/failed), trigger (check: manual/auto), rows_affected, error_message, started_at, finished_at. Índice `idx_tenant_update_runs_client_started`. GRANTS: service_role. |
| `supabase/migrations/20260807110000_gelobel_materialized_views.sql` | 3 Materialized Views no `tenant_gelobel`: `mv_vendas_diarias_resumo` (agregação diária de projecao_vendas_diaria), `mv_projecao_bases` (médias por empresa/mês/dia_semana), `mv_catalogo_custos` (catálogo com custo via compprod). Unique index em cada MV (obrigatório para REFRESH CONCURRENTLY). GRANTS: service_role. |
| `plans/escalabilidade-atualizacoes-dados-supabase.md` | Plano reorganizado com 4 fases, checklists funcionais por fase, e arquitetura atualizada. |

## Decisões tomadas durante a execução

1. **`mv_sales_orders` removida** — `tenant_gelobel` não possui tabela `sales_orders` (tornada opcional pelo `20260806160000_optional_schema_requirements_all.sql`). Confirmado com o usuário: pular esta MV.

## Validação

- Verificadas todas as dependências de tabelas referenciadas nas MVs:
  - `app_core.clients` ✅ (migration `20260706183000`)
  - `tenant_gelobel.projecao_vendas_diaria` ✅ (migration `20260726110000`)
  - `tenant_gelobel.simulador_produtos` ✅ (migration `20260724090000`)
  - `tenant_gelobel.compprod` ✅ (migration `20260806130000`)
  - `simulador_produtos.preco_custo` ✅ (migration `20260806130000_add_preco_custo_produtos`)
- SQL sintaticamente consistente com o padrão do projeto (BEGIN/COMMIT, idempotente com IF NOT EXISTS, comentários pt-BR, GRANTS explícitos).
- ⚠️ Migrations **não executadas** contra o Supabase (validação de sintaxe estrutural apenas).

## Próxima fase

**Fase 2** — Repositories e Services (Backend): `update_repository.py`, `materialization_repository.py`, `materialization_service.py`, `update_service.py`, `schemas/update.py`, `dependencies/redis.py`, `dependencies/services.py`.
