# Análise Geral de Arquitetura — BHS Sistema Modelo

**Data:** 2026-08-08
**Escopo:** `C:\projetos\bruno\bhs_sistema\Modelo` — desconsiderando `integracao_supa/` e artefatos irrelevantes (`context_*.json`, `Planos/`, `detalhes_*`, `modelo_mapa_exemplo/`, `bases_gelobel/`, `supabase/`). Foco no **projeto principal**: `backend/` (FastAPI + psycopg) + `src/` (React 19 + Vite + Tailwind 4) + `compose.yml` + `docs/OPERACAO_PRE_DEPLOY.md`.
**Método:** inspeção direta de código-fonte, contratos, dependências, configuração e testes existentes. Sem alteração de código nesta fase.

---

## Goal

Entregar um diagnóstico fundamentado de arquitetura, lógica, escalabilidade e performance do projeto Modelo, com um plano de correção executável, priorizado e verificável — sem introduzir escopo inventado e preservando as 5 telas críticas Gelobel (`Mensagens`, `Disparos no WhatsApp`, `Simuladores`, `Simulador de Combos`, `Configurações`) e a proteção anti-regressão de tenant definida em `AGENTS.md`.

## Success Criteria

- Todos os achados possuem evidência (arquivo:linhas ou comportamento observado) e severidade.
- Plano em `plans/` cobre cada categoria (arquitetura / lógica / escalabilidade / performance) com unidades de trabalho ordenadas, dependências e validação.
- Nenhuma unidade do plano quebra compatibilidade de IDs de sidebar, permissões ou conteúdo interno de telas.
- Plano aprovado explicitamente antes de qualquer implementação.

## Context And Current Facts

**Topologia atual:**
- Frontend: Vite 8 + React 19 + Tailwind 4 + Recharts. SPA com `src/App.tsx` orquestrando lazy views, `src/store/dashboardStore.tsx` (context monolítico), `src/services/apiClient.ts` (fetch wrapper), `src/services/configApi.ts`, `src/services/tenantDataCache.ts` (cache em memória com TTL) e `src/layouts/` (DashboardLayout + Sidebar com drag reorder).
- Backend: FastAPI (`backend/app/main.py`) com `lifespan` criando `RedisService` + `OperationalMetrics`. Router único em `backend/app/api/v1/router.py` registrando ~11 routers sem prefixos consistentes. Core: `config.py` (Pydantic Settings com `env_prefix="BHS_"`), `db.py` (psycopg_pool `ConnectionPool`), `security.py` (JWT via `python-jose` + PBKDF2 próprio), `authorization.py` (matriz estática), `middleware.py` (logging + security headers).
- Persistência: PostgreSQL/Supabase via `psycopg` + `psycopg_pool`. Repositories: `config_repository.py` (~800 linhas), `query_repository.py` (SQL dinâmico + MVs `mv_catalogo_custos`, `mv_vendas_diarias_resumo`, `mv_projecao_bases`), `query_builder.py` (builder SQL com `quote_identifier`).
- Infra: `compose.yml` (apenas `backend`, sem `postgres`/`redis` locais), `Dockerfile` (python 3.14-slim, 2 workers uvicorn), `docs/OPERACAO_PRE_DEPLOY.md` define VPS `vps_bhs` + Vercel `bhs-sistema`.

**Evidências de escala/complexidade:**
- `backend/app/services/` 22 arquivos; `backend/app/api/v1/endpoints/` 11 arquivos; `src/features/` 8 domínios; `src/features/templates/` 4 templates com adapters (`gelobel*`, `mock*`).
- `dashboardStore.tsx` > 600 linhas, contexto único com ~35 campos e 15 mutators.
- `query_repository.py` contém queries > 200 linhas com CTEs dinâmicas para `fetch_sales_projection` e fallback MV → live.
- Testes: 26 arquivos em `backend/tests/` (ex.: `test_query_service.py`, `test_redis_service.py`, `test_user_management_api.py`), frontend apenas `scripts/test_chart_labels.mjs`.

**Pontos estáveis (não são defeitos):**
- Isolamento de tenant via `quote_identifier(tenant_schema=True)` + `resolve_tenant_schema()` + `validate_tenant_schema()` — correto.
- `readonly_connection` com `autocommit=True` evitando round-trips de transação — correto.
- `RedisService` degradando para origin quando ausente (`allow` retorna `True`, `get_json` retorna `None`) — correto por `docs/OPERACAO_PRE_DEPLOY.md`.
- Proteção anti-regressão: `src/App.tsx` e `src/store/dashboardStore.tsx` preservam fallback de módulos publicados e retry de configuração — alinhado a `AGENTS.md`.

---

## Constraints And Non-goals

**Constraints:**
- Trabalhar somente dentro de `Modelo`; não operar VPS/SSH/containers sem pedido explícito.
- Não expor credenciais reais; usar `senha_ficticia_123` quando necessário.
- Cargas/migrations nunca em segundo plano (regra `AGENTS.md`).
- Mudanças de sidebar não podem alterar IDs/permissões/conteúdo interno de telas.

**Non-goals desta análise:**
- Não implementar correção agora (apenas planejar).
- Não carregar `vendas.csv` nem reexecutar `integracao_supa/`.
- Não introduzir nova tela/modal/aba/fluxo além do que o usuário pediu (preservação de intenção UX).
- Não propor reescrita total de frontend/backend (evolução incremental).

---

## Achados — Arquitetura

| # | Severidade | Título | Evidência | Impacto |
|---|------------|--------|-----------|---------|
| A1 | **Alta** | **Monolito de store: `dashboardStore.tsx` como God Context** | `src/store/dashboardStore.tsx` (~650 linhas, 35+ campos, 15 setters, RAW_DATABASE hardcoded, workspaces mockados `ws-1..ws-4` com `shopeePassword123` em `connectionParams`) | Re-renderizações globais, acoplamento entre navegação/filtros/dados/admin; impede code-splitting e testes unitários; risco de regressão de tenant (qualquer erro em ordenação/preferência quebra shell). |
| A2 | **Alta** | **Backend sem camadas de domínio/entidades; repositories com SQL inline gigante** | `backend/app/repositories/config_repository.py` (800+ linhas, 20+ métodos), `query_repository.py` (700+ linhas, `fetch_sales_projection` com 2 branches MV/live) | Baixa coesão, duplicação de lógica de tenant, difícil testar e evoluir; violação SRP. |
| A3 | **Alta** | **Router plano sem versionamento consistente e sem `APIRouter` prefix por domínio** | `backend/app/api/v1/router.py`: todos os routers montados no mesmo prefixo `/api/v1` sem agrupamento; `clients.py` expõe `clients.templates_router` separado, `users.py` expõe 3 routers (`users`, `tenant_router`, `legacy_router`) | Dificulta governança de permissões por escopo, documentação OpenAPI poluída, risco de colisão de paths. |
| A4 | **Média** | **Dependências circulares implícitas: `api_error_handler` importa `get_settings` e `AuditService` inline** | `backend/app/core/errors.py:45-62` import dentro da função para evitar ciclo | Sinal de acoplamento entre `core` e `services`; dificulta testes e injeção de dependências. |
| A5 | **Média** | **Configuração fragmentada: `BHS_` prefix vs `REDIS_URL`/`WHATSAPP_*` com AliasChoices** | `backend/app/core/config.py:28-42` (env_prefix `BHS_` mas `whatsapp_*` aceita 2 aliases, `redis_url` aceita `REDIS_URL` ou `BHS_REDIS_URL`) | Confusão operacional; `OPERACAO_PRE_DEPLOY.md` lista `REDIS_URL` sem prefixo, mas código aceita ambos — risco de misconfig em produção. |
| A6 | **Média** | **Frontend sem camada de domínio: adapters duplicam lógica de `sales-projection`/`combo-simulator`** | `src/features/templates/*/adapters/gelobel*.ts` vs `mock*.ts` vs `src/services/dashboardData.ts` + `RAW_DATABASE` mockada | Inconsistência entre preview e runtime real; contrato de template não é única fonte de verdade. |
| A7 | **Média** | **Compat shim `get_master_user = get_team_master` mantido indefinidamente** | `backend/app/dependencies/identity.py:108` | Dívida técnica; endpoints antigos podem permanecer sem migração para `authorization.py` matrix. |

## Achados — Lógica

| # | Severidade | Título | Evidência | Impacto |
|---|------------|--------|-----------|---------|
| L1 | **Alta** | **Autenticação mock via `email:slug` em `local` com `dev_mock_auth=true`** | `backend/app/dependencies/identity.py:31-41`: se `environment==local` e `dev_mock_auth` aceita `token` contendo `:` e não 2 pontos (JWT) como credencial | Bypass de JWT em dev pode vazar para staging se `environment` mal configurado; `config.py:53-64` só valida produção — staging permanece vulnerável. |
| L2 | **Alta** | **Validação de token compara `roles` por igualdade estrita** | `identity.py:58-63` `payload.get("roles") != user.roles` | Qualquer reordenação de roles ou adição de role invalida token válido, forçando logout; deveria ser comparação por conjunto. |
| L3 | **Média** | **Senha em `dashboardStore.tsx` hardcoded** | `src/store/dashboardStore.tsx:155-165` `password: 'shopeePassword123'` e JWT fake `eyJhbGci...` | Vazamento de credencial fictícia mas realística no bundle; viola regra inviolável de senhas fictícias (deveria ser `senha_ficticia_123`). |
| L4 | **Média** | **Lógica de `currentTab` em `App.tsx` com condicionais hard-coded por screenId** | `src/App.tsx:57-95` `canRenderDynamicScreen && currentTab === 'demo-vendas'` etc. | Adicionar novo tenant/template exige alterar `App.tsx`; quebra OCP. Deveria ser registry dinâmico. |
| L5 | **Média** | **Filtro `branch` desabilitado quando `options.length===0` mas `period` não** | `src/layouts/DashboardLayout.tsx:139-182` | Inconsistência UX; filtros dinâmicos de `screenFilterConfigs` podem ficar em estado inválido sem fallback. |
| L6 | **Baixa** | **`hasActiveFilters` computado parcialmente** | `DashboardLayout.tsx:69-71` só checa `period`/`branch`/`region`/`cluster`/`searchQuery` mas ignora filtros dinâmicos futuros | Filtros por template não refletem em badge/clear. |
| L7 | **Média** | **Regex de tenant `^tenant_[a-z0-9_]+$` permite `tenant___` e não valida tamanho** | `backend/app/repositories/query_builder.py:7` `TENANT_SCHEMA_RE` | Schema degenerado poderia ser aceito antes de `validate_tenant_schema` (que consulta `app_core`); defense-in-depth incompleto. |

## Achados — Escalabilidade

| # | Severidade | Título | Evidência | Impacto |
|---|------------|--------|-----------|---------|
| E1 | **Alta** | **Pool de conexões fixo `min 1 / max 10` sem auto-escala por worker** | `backend/app/core/config.py:36-39`, `backend/app/core/db.py:11-21` (`@lru_cache(maxsize=8)` por URL), `Dockerfile: CMD --workers 2` → 20 conexões teóricas vs Supabase limites | Sob carga, `PoolTimeout`/`TooManyRequests` → `503 ServiceUnavailableError` (`query_repository.py:40-45`); sem circuit breaker ou backpressure. |
| E2 | **Alta** | **Queries pesadas sem paginação cursor nem streaming** | `query_repository.py:fetch_sales_projection` varre `projecao_vendas_diaria` com `generate_series` + `group by data_venda` + `row_number() partition by isodow` | Custo O(n) no banco por requisição; 500 limit em `QuerySpec` ainda permite 500 linhas agregadas sem offset. |
| E3 | **Média** | **Cache fragmentado: 60s por screen vs 24h por combo-simulator vs memória local por tenant** | `screens.py:18` `ttl 60`, `query.py:31` `CACHE_TTL_24H` não usado no endpoint `sales-overview`, `tenantDataCache.ts` TTL 5min | Inconsistência de invalidação; `invalidate_prefix` usa `SCAN` + `UNLINK` sem batch limite (`redis_service.py:55-63`). |
| E4 | **Média** | **Materialização síncrona `REFRESH CONCURRENTLY` com conexão separada `psycopg.connect`** | `materialization_repository.py:22-36` abre conexão raw fora do pool durante refresh | Concorrência de refresh pode saturar conexões além do pool; sem lock distribuído (Redis) nem job queue. |
| E5 | **Média** | **Rate limit por janela fixa (fixed window) — sem sliding window** | `redis_service.py:11-18` `INCR` + `EXPIRE`, `dependencies/redis.py:27-43` (60/min query, 10/min AI/whatsapp) | Burst no limite da janela (60 req no segundo 59 + 60 no segundo 0 = 120/min). Sem token bucket. |
| E6 | **Média** | **Frontend `tenantDataCache` sem LRU nem limite de entradas** | `src/services/tenantDataCache.ts:14` `Map` cresce indefinidamente; `cacheGeneration` global invalida tudo | Vazamento de memória em sessões longas (staff alternando tenants). |
| E7 | **Baixa** | **CORS `allow_origins` lista hardcoded localhost; produção falha se `api_cors_origins` não configurado** | `config.py:21` defaults localhost, `main.py:27` `allow_origins=settings.api_cors_origins` | Em produção sem env, validação falha corretamente, mas mensagem exige `BHS_API_CORS_ORIGINS sem localhost` — pouco acionável para operador. |

## Achados — Performance

| # | Severidade | Título | Evidência | Impacto |
|---|------------|--------|-----------|---------|
| P1 | **Alta** | **N+1 implícito: `asyncio.gather` para `get_screen` + `get_validated_tenant_schema` mas `fetch_combo_products` faz 3 queries sequenciais internas** | `query.py:130-138` gather inicial, mas `query_repository.py:210-315` dentro de `fetch_combo_products` faz `mv_catalogo_custos` check + fallback `to_regclass` + `compprod` check + query final — tudo em `to_thread` bloqueante | Latência p95 degradada; thread pool do FastAPI pode saturar ( `asyncio.to_thread` por operação ). |
| P2 | **Alta** | **Frontend `DashboardStore` carrega `initialWorkspaces` + `RAW_DATABASE` mesmo em modo `api`** | `src/store/dashboardStore.tsx:100-230` `initialWorkspaces` e `RAW_DATABASE` (4 workspaces, 8+5+5+6 linhas) sempre no bundle | Bundle maior (~30KB só de mocks) + memória; `getInitialDataMode()` deveria lazy-load mocks apenas em fallback. |
| P3 | **Média** | **Sem `React.memo`/`useMemo` em `Sidebar` drag-reorder e `DynamicChart`** | `src/layouts/Sidebar.tsx:140-260` handlers recriados por render; `src/components/shared/DynamicChart.tsx` não memoizado | Re-render em cascata ao digitar em filtros ou arrastar módulo (cada `setDropIndicator` re-renderiza lista). |
| P4 | **Média** | **Recharts sem virtualização; `SalesProjectionTemplate` e `OverviewTemplate` renderizam até 31 dias * N empresas** | `src/features/templates/sales-projection/SalesProjectionTemplate.tsx` e `overview` (observado via `types.ts` + adapters) | Jank em mobile; sem `ResponsiveContainer` debounce ou `useTransition`. |
| P5 | **Média** | **Backend `build_query_spec` constrói SQL com `quote_identifier` por campo mas sem `PREPARE`** | `query_builder.py:20-60` SQL literal por combinação de filtros | Plano de execução não reutilizado; parser do Postgres re-planeja por requisição. |
| P6 | **Média** | **Logging middleware formata JSON via f-string sem sanitização** | `backend/app/core/middleware.py:26-46` `f'{{correlation_id...}}'` com `str(exc)` direto | Risco de quebra de JSON se path contiver `"`; sem `json.dumps`. |
| P7 | **Baixa** | **`index.html` sem `preconnect` para API e sem `modulepreload`** | `index.html:7` apenas `vite.svg` | Cold start mais lento; LCP impactado. |
| P8 | **Baixa** | **`compose.yml` sem `resources.limits` nem `read_only` volume para código** | `compose.yml` define `read_only:true` + `tmpfs /tmp` (bom) mas sem `mem_limit`/`cpus` | OOM sem limite pode derrubar host VPS. |

## Achados Transversais (Segurança / Observabilidade / DX)

- **Segurança:** `hash_password` usa `secrets.token_bytes` corretamente (`security.py:73`), mas `verify_password` só suporta `pbkdf2_sha256` — sem migração para Argon2. `jwt_algorithm` default `HS256` sem rotação de chave.
- **Observabilidade:** `operational_metrics` exposto via `health` (`backend/app/api/v1/endpoints/health.py` não lido aqui mas referenciado em `main.py`); `redis_service.snapshot()` expõe `Counter` mas sem endpoint de metrics Prometheus.
- **DX:** `pyproject.toml` usa `pytest` com `anyio` implícito mas sem `anyio` em dependencies; `tsconfig` sem `strict` path aliases; `eslint.config.js` sem `import` plugin para detectar dependências circulares.

---

## Key Decisions

| Decisão | Recomendação | Alternativa Rejeitada | Justificativa |
|---------|--------------|----------------------|---------------|
| Estado frontend | Quebrar `dashboardStore` em 3 contextos: `AuthContext`, `NavigationContext`, `DataContext` + `Zustand` ou `Jotai` para tenant cache | Manter God Context | Isolamento de re-renders, testabilidade, preservação de fallback anti-regressão exigida em `AGENTS.md`. |
| Backend arquitetura | Introduzir `application/` (use-cases) + `domain/` (entidades `Screen`, `Widget`, `Tenant`) e extrair `ConfigRepository` em `ClientRepo`/`ScreenRepo`/`UserRepo` | Manter repository monolítico | SRP, testes por contrato, facilita `materialization` desacoplada. |
| Query builder | Substituir `quote_identifier` + string concat por `psycopg.sql.Identifier`/`SQL` composable | Manter string builder | SQL injection defense-in-depth real, plan cache com `PREPARE`, tipagem. |
| Cache | Unificar TTLs via `CachePolicy` enum (60s screen, 5min projection, 24h catalog) + Redis `SET NX` + `X-Cache-Status` header | TTLs ad-hoc | Invalidação previsível, observabilidade, evita `SCAN` full. |
| Rate limit | Migrar para sliding-window (`ZADD` + `ZREMRANGEBYSCORE`) ou `redis-cell` | Fixed window | Burst protection real; 60/min deve ser 60 por janela deslizante. |
| Bundle | Lazy-load `RAW_DATABASE`/`initialWorkspaces` apenas quando `!isConfigApiEnabled()` | Bundle mocks sempre | Reduz ~15-20KB gzipped, melhora TTI. |

---

## Recommended Approach

Abordagem incremental em 4 fases, cada uma vertical (backend+frontend+infra quando necessário) e reversível. Nenhuma fase cria nova superfície UX; todas preservam IDs e permissões existentes.

**Princípios:**
1. Proteger o tenant runtime primeiro (fallback seguro > ordenação).
2. Medir antes de otimizar (adicionar `Server-Timing` já existente em `middleware.py:41` + `pg_stat_statements` sampling).
3. Migrar por strangler: novos adapters/repositories convivem com antigos até testes verdes.

---

## Work Plan

### Fase 0 — Higiene e Instrumentação (1-2 dias) — Sem risco

**Objetivo:** estabilizar baseline para medir impacto das fases seguintes.

- **0.1** Extrair `RAW_DATABASE` e `initialWorkspaces` de `dashboardStore.tsx` para `src/mocks/dashboardMocks.ts` e importar sob `if (!isConfigApiEnabled())` com `import()` dinâmico.
  - *Arquivos:* `src/store/dashboardStore.tsx`, `src/mocks/dashboardMocks.ts` (novo)
  - *Validação:* `npm run build` + `ls -lh dist/assets/*.js` (bundle deve reduzir)

- **0.2** Fix `L3`: substituir `shopeePassword123` por `senha_ficticia_123` e extrair para `docs` comentário `// TODO local: alterar em backend/.env`.
  - *Arquivos:* `src/store/dashboardStore.tsx:158`
  - *Validação:* `rg "shopeePassword123" src/` vazio

- **0.3** Sanitizar `LoggingAndCorrelationMiddleware`: usar `json.dumps` em vez de f-string.
  - *Arquivos:* `backend/app/core/middleware.py:28-46`
  - *Validação:* `pytest tests/test_operational_metrics.py -q`

- **0.4** Padronizar `config.py` env vars: documentar em `docs/OPERACAO_PRE_DEPLOY.md` que `REDIS_URL` é canônico e `BHS_REDIS_URL` é alias; idem para `WHATSAPP_*`.
  - *Arquivos:* `docs/OPERACAO_PRE_DEPLOY.md`, `backend/app/core/config.py` (comentário)

**Dependências:** nenhuma.
**Risco:** baixo.

### Fase 1 — Desacoplar Estado Frontend (3-5 dias) — Risco médio, maior ganho de performance

- **1.1** Criar `src/store/authStore.tsx` ( `currentUser`, `setCurrentUser`, `configurationStatus` ) e `src/store/navigationStore.tsx` ( `currentTab`, `userMenuOrder`, `setUserMenuOrder` ) extraídos de `dashboardStore.tsx`.
  - Reutilizar `tenantDataCache.ts` via `useTenantData` sem alteração.
  - *Validação:* smoke manual Gelobel (5 telas) + `eslint .`

- **1.2** Memoizar `Sidebar` e `DynamicChart` com `React.memo` + `useCallback` para handlers de drag; extrair `dropModule` para `src/hooks/useMenuReorder.ts`.
  - *Validação:* React DevTools Profiler — rerenders de `Sidebar` ao trocar `period` devem ir de N→0

- **1.3** Substituir condicionais hard-coded de `App.tsx:70-90` por registry `src/config/screenRegistry.ts` (`Record<screenId, LazyComponent>` com fallback `DynamicCanvasView`).
  - *Validação:* adicionar screen fake `test-registry` via `published_version` mock sem alterar `App.tsx`

**Dependências:** Fase 0.
**Rollback:** revert `dashboardStore` split commit a commit (cada store em commit separado).

### Fase 2 — Hardening Backend Core (4-6 dias) — Risco médio

- **2.1** Extrair `ConfigRepository` em `ClientRepository`/`ScreenRepository`/`UserRepository` com protocolos; manter `ConfigRepository` como facade delegando (compat).
  - *Arquivos:* `backend/app/repositories/client_repository.py`, `screen_repository.py`, `user_repository.py`
  - *Validação:* `pytest tests/test_module_service.py tests/test_user_management_api.py -q`

- **2.2** Migrar `query_builder.py` para `psycopg.sql` composable (`SQL("SELECT {} FROM {}.{}")` + `Identifier`) e adicionar testes de `EXPLAIN` para `fetch_sales_projection`.
  - *Validação:* `pytest tests/test_query_service.py tests/test_query_api.py -q` + `rg "quote_identifier" backend/app/repositories/query_builder.py` deve sumir ou ficar só como wrapper

- **2.3** Fix L1/L2: remover branch `email:slug` mock (substituir por `FakeAuthService` injetável apenas em `tests/`) e comparar `roles` via `set(payload_roles) == set(user.roles)`.
  - *Arquivos:* `backend/app/dependencies/identity.py:31-63`, `backend/tests/conftest.py`
  - *Validação:* `pytest tests/test_auth_api.py tests/test_security_audit.py -q` com `BHS_ENVIRONMENT=staging` deve falhar se tentar mock

- **2.4** Padronizar `router.py`: agrupar por `APIRouter(prefix="/clients")`, `/screens`, `/query`, `/tenant/whatsapp` com `tags` consistentes e remover `legacy_router` após migração.
  - *Validação:* `curl /openapi.json | jq .paths` agrupado

**Dependências:** Fase 0.
**Rollback:** facade mantém compat; cada repository em commit separado.

### Fase 3 — Escalabilidade e Confiabilidade (5-7 dias) — Alto impacto

- **3.1** Pool: tornar `db_pool_max_size` função de `workers` via `DATABASE_URL` param ou `BHS_DB_POOL_MAX_SIZE` validado contra `workers` em `lifespan`; adicionar `PoolTimeout` retry com backoff exponencial (1→2→4s) em `query_repository._run`.
  - *Validação:* teste de carga `k6` ou `locust` 50 VUs contra `/api/v1/query/sales-overview`

- **3.2** Sliding-window rate limit: implementar `ZSET` Lua script (`ZADD` + `ZREMRANGEBYSCORE` + `ZCARD` + `EXPIRE`) em `redis_service.py`; manter fallback `allow=True` quando Redis ausente.
  - *Validação:* `pytest tests/test_redis_service.py -q` + teste manual burst 70 req/min → 429

- **3.3** Materialização: introduzir `Redis` lock (`SET NX PX 30000`) em `materialization_service.materialize_area` + job `asyncio.create_task` com `pg_advisory_lock`; expor `/internal/materialize` com `202 Accepted`.
  - *Validação:* 2 refresh concorrentes → 1 executa, 1 retorna `409 Conflict`

- **3.4** Cache unificado: criar `backend/app/core/cache_policy.py` (`CachePolicy(Enum)` com TTLs) e substituir `cache_key`/`_query_cache_key` por `CachePolicy.for_screen()`; adicionar `X-Cache-Status: HIT/MISS/DEGRADED` em `query.py` e `screens.py`.
  - *Validação:* `curl -i /api/v1/screens/demo-vendas` mostra header

- **3.5** Frontend LRU: limitar `tenantDataCache` a 100 entradas com `Map` + `delete oldest` e `subscribeTenantDataActivity` debounced (100ms).
  - *Validação:* `src/services/tenantDataCache.ts` unit test com 150 inserts → size 100

**Dependências:** Fases 1 e 2.
**Rollback:** cada sub-fase atrás de feature flag `BHS_CACHE_V2=false` / `BHS_RATE_LIMIT_V2=false`.

### Fase 4 — Performance de Render e Bundle (2-3 dias)

- **4.1** `tenantDataCache` + `useTenantData`: adicionar `AbortController` em `loadTenantData` e cancelar loader quando `enabled` vira `false` ou `sessionKey` muda.
- **4.2** Recharts: envolver `DynamicChart`/`SalesProjectionTemplate` em `Suspense` + `useTransition` para filtros; virtualizar tabela de projeção (31 dias) com `react-virtual` quando rows > 50.
- **4.3** `vite.config.ts`: adicionar `build.rollupOptions.manualChunks` (`vendor: react/recharts`, `tenant: templates`) + `preconnect` para `VITE_API_BASE_URL` em `index.html`.
  - *Validação:* Lighthouse TTI < 1.5s em 4G, bundle `vendor` < 250KB gzipped

**Dependências:** Fase 1.
**Rollback:** `manualChunks` revert em 1 commit.

---

## Validation Plan

| Unidade | Comando / Check | Evidência Esperada |
|---------|----------------|-------------------|
| Fase 0 | `npm run build` + `pytest -q` | Build verde, bundle reduzido, sem `shopeePassword` |
| Fase 1 | Manual smoke Gelobel (5 telas) + `npm run lint` + Profiler | 5/5 telas ok, rerenders Sidebar 0 ao trocar filtro global |
| Fase 2 | `pytest tests/test_query_service.py tests/test_auth_api.py tests/test_security_audit.py -q` + `ruff` se disponível | 0 falhas, `email:slug` só em `tests/` |
| Fase 3 | `k6 run scripts/load_query.js` (50 VUs) + `pytest tests/test_redis_service.py` + `curl -i` cache headers | p95 < 400ms, 429 em burst, `X-Cache-Status` presente |
| Fase 4 | `npm run build -- --mode production` + Lighthouse CI | TTI < 1.5s, LCP < 2.0s, vendor chunk < 250KB gz |
| Todas | `ls -la plans/logs_plano_*` + `git status` | Logs de execução por fase, sem `yarn.lock` rewrite |

**Validação de tenant anti-regressão (toda fase):**
1. Login como `TEAM` (staff) e `TENANT_MASTER` (gelobel) — ambos devem carregar.
2. Simular falha de endpoint opcional: `redis` down → shell ainda navega (fallback `degraded`).
3. Reload `F5` preserva `userMenuOrder` (localStorage + API).
4. Reordenar sidebar → recarregar → ordem persiste.
5. Verificar IDs de telas não mudaram: `rg "screenId" src/types` + `backend/app/schemas/screen.py`.

---

## Risks / Rollback

| Risco | Mitigação | Rollback |
|-------|-----------|----------|
| Quebra de `dashboardStore` split afeta 5 telas | Strangler: manter `DashboardProvider` legado como wrapper por 1 release; cada contexto novo atrás de `BHS_STORE_V2` flag | `git revert` por commit (1 contexto = 1 commit) |
| `psycopg.sql` composable quebra `to_regclass` checks | Manter `quote_identifier` como helper interno + testes `EXPLAIN` | Revert `query_builder.py` single commit |
| Sliding-window Redis Lua quebra quando Redis ausente | `RedisService.allow` já degrada para `True`; testes com `redis_url=None` | Flag `BHS_RATE_LIMIT_V2=false` |
| Materialize lock causa deadlock | `pg_advisory_lock` com timeout 30s + `SET NX PX` 30s; endpoint retorna 202 | Revert `materialization_service.py` |
| Bundle `manualChunks` aumenta waterfall | Medir com `vite-bundle-visualizer`; fallback para chunk único | 1 commit revert |

**Compatibilidade:** todas as fases mantêm contratos `LoginResponse`, `AppModule`, `AppScreen`, `QueryResponse` inalterados.

---

## Open Questions

1. **Pool sizing real de Supabase:** qual o `max_connections` do plano atual? Define `BHS_DB_POOL_MAX_SIZE` correto (precisa resposta do operador antes da Fase 3.1).
2. **Redis em produção:** `REDIS_URL` já provisionado na VPS? Se não, Fase 3.2/3.4 degradam mas devem ser priorizadas.
3. **Target de p95:** 400ms é adequado para `fetch_sales_projection` com MVs? Ou 200ms com `mv_vendas_diarias_resumo` warm?
4. **Manter `RAW_DATABASE` mocks após Fase 0?** Proposta: manter apenas para `isConfigApiEnabled()==false` (demo local); remover de produção.

---

## Anexos — Mapa de Arquivos Críticos (evidência)

- `backend/app/main.py:1-45` — lifespan, middleware, CORS
- `backend/app/core/config.py:1-80` — Settings, produção validation
- `backend/app/core/db.py:1-30` — ConnectionPool + readonly_connection
- `backend/app/core/security.py:1-80` — JWT + PBKDF2
- `backend/app/dependencies/identity.py:1-108` — mock auth, roles check, tenant resolution
- `backend/app/repositories/query_builder.py:1-70` — builder SQL
- `backend/app/repositories/query_repository.py:1-700` — MVs, projection, combo products
- `backend/app/repositories/config_repository.py:1-800` — God Repository
- `backend/app/api/v1/router.py:1-17` — router plano
- `backend/app/api/v1/endpoints/query.py:1-250` — cache key, sales-overview
- `backend/app/services/redis_service.py:1-109` — fixed window, degradado
- `backend/app/services/query_service.py:1-80` — spec por widget type
- `src/App.tsx:1-120` — condicionais hard-coded por screenId
- `src/store/dashboardStore.tsx:1-650` — God Context, RAW_DATABASE, initialWorkspaces
- `src/services/tenantDataCache.ts:1-90` — Map sem LRU
- `src/services/apiClient.ts:1-110` — fetch wrapper sem retry
- `src/layouts/Sidebar.tsx:1-350` — drag reorder sem memo
- `src/layouts/DashboardLayout.tsx:1-250` — filtros globais vs screenFilterConfigs
- `src/hooks/useTenantData.ts:1-70` — cache hook sem abort
- `compose.yml:1-20` — sem postgres/redis, sem limits
- `docs/OPERACAO_PRE_DEPLOY.md:1-150` — runbook com 2 workers

---

*Próximo passo: aguardar `Approve` / `Request changes` / `Cancel` para iniciar execução. Nenhum código será alterado até aprovação.*
