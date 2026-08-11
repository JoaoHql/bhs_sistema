# FASE 6 — Correção Projeção Gelobel (Filtro, Gauges e Tabela)

Data: 2026-08-10
Plano: `plans/PLANO_CORRECAO_PROJECAO_VENDAS_GELOBEL.md` (renomeado de YELLOW_BELL → GELOBEL)

## Escopo executado
- Filtro mês mais recente: default `All` em modo API e sincronização por `months.includes(period)` em `SalesProjectionTenantView`
- Gauges: redução sutil de altura (r 105→96, SW 24→20, max-w 280→260, viewBox 135→125, mt-5→mt-3, padding reduzido)
- Tabela: removidos botões de expansão do footer (15/30/restaurar), mantido seletor do header; dedup defensivo 1 linha/dia (backend `query_repository.fetch_sales_projection` + adapter `gelobelSalesProjectionAdapter`)
- Renomeado plano Yellow Bell → Gelobel

## Arquivos alterados
- `src/store/dashboardStore.tsx`
- `src/features/vendas/views/SalesProjectionTenantView.tsx`
- `src/features/templates/sales-projection/SalesProjectionTemplate.tsx`
- `src/features/templates/sales-projection/adapters/gelobelSalesProjectionAdapter.ts`
- `backend/app/repositories/query_repository.py`
- `plans/PLANO_CORRECAO_PROJECAO_VENDAS_GELOBEL.md` (renomeado/corrigido)
- `~/.commandcode/plans/correcao-projecao-vendas-gelobel.md` (plano aprovado)

## Validacao
- `npm run build` — OK (vite build 2456 modules, sem erro)
- `npx tsc --noEmit --skipLibCheck` — OK
- `python -m py_compile` backend — OK
- Smoke Gelobel: sem alteração de IDs/permissões/sidebar; fórmulas preservadas
