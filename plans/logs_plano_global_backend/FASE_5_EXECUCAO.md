## Fase 5: Execucao

Data: 2026-07-07

Escopo executado:

- Frontend conectado ao endpoint `POST /api/v1/query`.
- Contratos TS `QueryRequest` e `QueryResponse` adicionados.
- `apiClient.post()` criado com headers `x-client-slug` e `x-user-email`.
- `queryApi` criado com flag `VITE_QUERY_API_ENABLED` ou `VITE_CONFIG_API_ENABLED`.
- `DynamicChart` consulta backend quando recebe `screenId` e `widgetId`.
- KPIs dinamicos consultam backend por widget publicado.
- Tabelas dinamicas consultam backend e mantem busca/sort sobre linhas retornadas.
- Filtros globais ativos viram payload `filters`.
- Fallback local permanece apenas fora do modo backend efetivo.

Arquivos alterados:

- `src/services/apiClient.ts`
- `src/services/queryApi.ts`
- `src/types/index.ts`
- `src/store/dashboardStore.tsx`
- `src/components/shared/DynamicChart.tsx`
- `src/features/cadastros/views/DynamicCanvasView.tsx`
- `plans/FASE_5_ADAPTACAO_FRONTEND_BACKEND.md`
- `plans/PLANO_GLOBAL_BACKEND_MULTI_CLIENTE.md`

Validacoes:

- `npm.cmd run build`: passou, com aviso conhecido de chunk Vite maior que 500 kB.
- `python -m pytest` em `backend/`: 18 passed.
- Supabase real via backend `POST /api/v1/query`:
  - `bhs-demo`: 200, 2 linhas.
  - `acme-demo`: 200, 2 linhas.

Pendencias:

- Validacao visual em browser deve ficar para fase seguinte de QA/homologacao.
