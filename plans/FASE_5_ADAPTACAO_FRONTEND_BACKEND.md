## Fase 5: Adaptacao do Frontend Atual ao Backend

Status: concluida em 2026-07-07
Data de criacao: 2026-07-07

Checklist resumido para validacao:

- [x] Contratos TypeScript para `/api/v1/query` criados.
- [x] `apiClient` suporta `POST` com headers de cliente/usuario.
- [x] `configApi` ou novo `queryApi` expoe consulta de dados.
- [x] `DynamicChart` consome dados assincronos do backend.
- [x] KPIs dinamicos consomem dados assincronos do backend.
- [x] Tabelas dinamicas consomem dados do backend ou mantem fallback explicito quando ainda nao suportadas.
- [x] Filtros globais/tela sao enviados ao backend.
- [x] Estados de loading, vazio e erro preservam layout.
- [x] Mock permanece apenas em modo dev controlado.
- [x] Fallback silencioso para mock em modo backend removido.
- [x] Configuracao publicada continua vindo do backend.
- [x] Uma tela dinamica publicada renderiza sem novo arquivo React.
- [x] Build frontend passa.
- [x] Testes/backend existentes continuam passando.
- [x] `python summarize.py` executado ao fechar a fase.

## Objetivo

Conectar o frontend atual ao endpoint real `POST /api/v1/query`, preservando visual, filtros, layout, espacamento e componentes existentes.

Esta fase nao deve redesenhar telas. O foco e trocar a origem dos dados: sair de agregacao local em `queryWorkspaceData` para consulta backend controlada por configuracao publicada.

## Contexto Atual

- Fase 3 entregou configuracao publicada por cliente.
- Fase 4 entregou `/api/v1/query`, com allowlist, isolamento por tenant schema e validacao de tela/widget/filtro.
- Frontend ja carrega modulos/telas via `configApi.modules()` quando `VITE_CONFIG_API_ENABLED=true`.
- `DynamicChart` ainda chama `queryWorkspaceData(config)` de forma sincrona.
- `DynamicCanvasView` ainda calcula KPI via `queryWorkspaceData(tempConfig)`.
- Dados locais/mock ainda podem mascarar falha real se nao houver controle claro por modo.

## Decisoes Fixadas

- Frontend nao escolhe schema, tabela, SQL, campo livre nem fonte de dados.
- Frontend envia apenas `screenId`, `widgetId`, `filters` e `limit`.
- Backend continua sendo autoridade de permissao, tenant, tela, widget, filtros e fonte.
- `DynamicChart` deve continuar sendo o componente visual padrao de graficos.
- `DynamicCanvasView` deve continuar sendo a tela generica para telas publicadas.
- Mock so pode existir quando modo dev/mock estiver explicitamente ativo.
- Em modo backend, erro de API deve aparecer como erro controlado, nao como dado falso.

## Escopo

### 1. Contratos frontend

- [x] Criar tipos TS para request/response de query:
  - `QueryRequest`
  - `QueryMetadata`
  - `QueryResponse`
- [x] Mapear aliases do backend:
  - `screenId`
  - `widgetId`
  - `filters`
  - `limit`
  - `rows`
  - `metadata`
- [x] Garantir que `rows` seja aceito como `Record<string, unknown>[]`.

### 2. Cliente HTTP

- [x] Adicionar `post<TRequest, TResponse>()` em `src/services/apiClient.ts`.
- [x] Preservar tratamento atual de erro com `ApiClientError`.
- [x] Centralizar headers temporarios:
  - `x-client-slug`
  - `x-user-email`
- [x] Ler valores por env/local dev enquanto Auth final nao existe:
  - `VITE_CLIENT_SLUG`
  - `VITE_USER_EMAIL`
- [x] Nao hardcodar cliente final em componente visual.

### 3. API de query no frontend

- [x] Criar `src/services/queryApi.ts` ou expandir `configApi` com `query()`.
- [x] Implementar chamada:

```ts
POST /api/v1/query
```

- [x] Payload minimo:

```json
{
  "screenId": "demo-vendas",
  "widgetId": "wid-bhs-receita-canal",
  "filters": {},
  "limit": 100
}
```

- [x] Resposta esperada:

```json
{
  "screenId": "demo-vendas",
  "widgetId": "wid-bhs-receita-canal",
  "rows": [],
  "metadata": {
    "rowCount": 0,
    "appliedFilters": [],
    "source": "orders"
  }
}
```

### 4. Estado de filtros

- [x] Criar adaptador unico para transformar filtros globais atuais em `filters` do backend.
- [x] Incluir apenas filtros com valor real, removendo `All`, vazio e `undefined`.
- [x] Mapear filtros atuais:
  - `branch`
  - `region`
  - `cluster`
  - `period`
  - `searchQuery`, somente se backend/config permitir.
- [x] Se filtro nao for permitido pelo backend, o erro deve aparecer controlado.
- [x] Nao aplicar filtro local duplicado em dados ja filtrados pelo backend.

### 5. `DynamicChart`

- [x] Alterar entrada para receber contexto minimo de tela/widget:
  - `screenId`
  - `widgetId`
  - `config`
- [x] Carregar dados via backend quando query API estiver ativa.
- [x] Manter `queryWorkspaceData(config)` apenas como fallback dev explicito.
- [x] Preservar todos os tipos visuais atuais:
  - bar
  - line
  - pie
  - area, se existente no componente
  - kpi, quando aplicavel
- [x] Preservar tooltip, cores, formatacao e mensagens vazias.
- [x] Criar loading sem alterar dimensoes do card/grafico.
- [x] Criar erro controlado sem quebrar a tela inteira.

### 6. KPIs dinamicos

- [x] Substituir calculo sincrono de KPI em `DynamicCanvasView` por consulta async.
- [x] Evitar `queryWorkspaceData(tempConfig)` em modo backend.
- [x] Manter cards com mesmo layout, icone, tipografia e espacamento.
- [x] Exibir loading/erro por card, sem deslocar grid.
- [x] Garantir que widget `kpi_card` use `widgetId` real publicado.

### 7. Tabelas dinamicas

- [x] Identificar renderizacao atual de tabelas em `DynamicCanvasView`.
- [x] Se tabela publicada tiver `tableConfig`, consultar backend.
- [x] Se ainda faltar suporte visual/contrato, manter fallback dev explicito e registrar pendencia.
- [x] Preservar busca/sort local apenas sobre linhas ja retornadas pelo backend.
- [x] Nao buscar raw workspace data em modo backend real.

### 8. Controle de modo

- [x] Definir regra clara:
  - `VITE_CONFIG_API_ENABLED=true`: configuracao vem do backend.
  - `VITE_QUERY_API_ENABLED=true`: dados vem do backend.
  - mock/local apenas quando flags permitirem.
- [x] Em modo backend, falha de API nao pode cair silenciosamente para mock.
- [x] Exibir toast ou estado local de erro em falha real.

### 9. Preservacao visual

- [x] Nao refatorar layout global fora do necessario.
- [x] Nao trocar biblioteca de graficos.
- [x] Nao redesenhar cards, filtros, sidebar ou dashboard shell.
- [x] Nao alterar paleta/espacamento/tipografia sem motivo funcional.
- [x] Garantir que loading/erro/vazio usem area estavel e nao causem salto visual.

### 10. Validacoes

- [x] Rodar `npm.cmd run build`.
- [x] Rodar `python -m pytest` em `backend/`.
- [x] Rodar teste manual com backend mock sem `BHS_DATABASE_URL`.
- [x] Rodar teste manual com Supabase real, se conexao estiver disponivel.
- [x] Validar BHS:
  - tela publicada carrega
  - grafico retorna linhas
  - filtro permitido funciona
- [x] Validar ACME:
  - tela publicada carrega
  - dados sao diferentes de BHS
- [x] Validar erro:
  - widget inexistente nao quebra tela
  - filtro proibido vira erro controlado
- [x] Rodar `python summarize.py`.

## Fora de Escopo

- Auth JWT/Supabase Auth final.
- Area administrativa interna de publicacao.
- Editor visual completo de telas.
- Criacao de novos schemas tenant.
- Mudanca profunda no design system.
- Reescrita dos dashboards legados estaticos.
- Otimizacao de chunk Vite, exceto se bloquear build.

## Arquivos Provaveis

- `src/services/apiClient.ts`
- `src/services/configApi.ts`
- `src/services/queryApi.ts`
- `src/types/index.ts`
- `src/store/dashboardStore.tsx`
- `src/components/shared/DynamicChart.tsx`
- `src/features/cadastros/views/DynamicCanvasView.tsx`
- `plans/logs/FASE_5_EXECUCAO.md`

## Riscos Graves

- Fallback silencioso esconder erro real de backend.
- Filtro aplicado duas vezes: uma no frontend e outra no backend.
- Widget sem `id` estavel impedir consulta por `widgetId`.
- `DynamicChart` virar assíncrono de forma quebrada e causar render loop.
- KPIs continuarem usando dado local enquanto graficos usam backend.
- Headers temporarios de cliente/usuario ficarem espalhados em componentes.
- Erro de API derrubar a tela inteira.
- Mudanca visual acidental em telas ja aprovadas.

## Estrategia de Execucao

1. Criar contratos e `queryApi`.
2. Adicionar `POST` e headers no `apiClient`.
3. Criar helper de filtros backend.
4. Adaptar `DynamicChart` com loading/erro/fallback dev.
5. Adaptar KPI no `DynamicCanvasView`.
6. Adaptar tabela dinamica ou isolar fallback explicito.
7. Validar build/testes/backend real.
8. Atualizar plano, log e mapas.

## Criterios de Conclusao

- Front renderiza telas vindas do backend.
- Graficos principais usam `/api/v1/query`.
- KPIs principais usam `/api/v1/query`.
- Filtros sao enviados ao backend e funcionam.
- Layout atual permanece visualmente preservado.
- Mock nao mascara erro em modo backend.
- Uma tela publicada pode renderizar sem criar novo arquivo React.
- Build e testes passam.
