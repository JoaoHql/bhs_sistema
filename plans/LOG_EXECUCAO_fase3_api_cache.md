# Fase 3 — Execução: API Endpoints e Cache Redis

**Data:** 2026-08-07

## Escopo executado

- **Plano base:** `plans/escalabilidade-atualizacoes-dados-supabase.md` — Fase 3

## Arquivos criados

| Arquivo | Descrição |
|---|---|
| `backend/app/api/v1/endpoints/updates.py` | Router `GET /api/v1/tenant/updates` (status por área), `GET /runs` (histórico de execuções), `POST /refresh` (dispara materialização + invalida cache). Protegido por `rate_limit_updates` e `get_tenant_master`. Padrão idêntico ao `whatsapp.py`. |

## Arquivos modificados

| Arquivo | Mudança |
|---|---|
| `backend/app/repositories/query_repository.py` | `fetch_combo_products`: verifica `to_regclass('mv_catalogo_custos')` → se existe, lê direto (unit_cost pré-computado), sem JOIN compprod. Fallback para consulta legada (simulador_produtos + compprod). `fetch_sales_projection`: verifica `to_regclass('mv_vendas_diarias_resumo')` → se existe, CTEs `current_day`/`previous_year` leem da MV (2x menos scan da tabela base). Fallback para consulta original. |
| `backend/app/api/v1/endpoints/query.py` | Cache Redis 24h (`CACHE_TTL_24H = 86400`) nos endpoints `combo-simulator-products` e `sales-projection`. `_query_cache_key()` gera chave determinística via MD5 dos parâmetros. Padrão: `get_json` → hit direto sem ir ao banco; `set_json` após resposta bem-sucedida. Prefixo `bhs:cache:tenant:{slug}:query:{endpoint}:{digest}` compatível com `invalidate_prefix` do UpdateService. |
| `backend/app/api/v1/router.py` | Registro do router `updates` com tag `tenant-updates`. |

## Validação

- `python -m compileall app`: **100% limpo** (query.py, updates.py, query_repository.py, router.py compilados).
- `python -m pytest`: **129 passed, 5 failed** — os 5 falhos são **pré-existentes** (mesmos da Fase 2). Nenhum novo teste quebrou.

## Decisões tomadas

- Cache Redis aplicado **apenas nos endpoints que usam MVs** (`combo-simulator-products`, `sales-projection`), não no `sales-overview` (que usa `sales_orders`, tabela não suportada para Gelobel).
- `model_dump(by_alias=True)` garante camelCase nas chaves Redis, idêntico ao JSON da API → desserialização direta com `**cached`.
- Redis ausente = degrade silencioso (get_json retorna None, set_json ignora erro) — o sistema funciona mesmo sem Redis.
- `Router.post("/refresh")` aceita `RefreshRequest.area: str | None` — None = refresh de todas as 3 áreas.

## Próxima fase

**Fase 4** — Frontend (Painel Atualizações): `updatesApi.ts`, `UpdatesPanel.tsx`, integração na aba Configurações.
