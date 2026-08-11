# Fase 4 - Execucao

Data: 2026-07-07
Status: concluida

## Escopo

- Criado endpoint `POST /api/v1/query`.
- Criados contratos Pydantic de request/response.
- Criado `QueryService`.
- Criado `QueryRepository` real para Supabase/Postgres.
- Criado `MockQueryRepository` para desenvolvimento/testes.
- Criado `query_builder` com allowlist, quote de identificadores e parametros.
- Criados testes de service, builder e API.

## Arquivos

- `backend/app/schemas/query.py`
- `backend/app/api/v1/endpoints/query.py`
- `backend/app/services/query_service.py`
- `backend/app/repositories/query_builder.py`
- `backend/app/repositories/query_repository.py`
- `backend/app/repositories/mock_query_repository.py`
- `backend/app/dependencies/services.py`
- `backend/app/api/v1/router.py`
- `backend/app/core/errors.py`
- `backend/app/repositories/mock_config_repository.py`
- `backend/tests/test_query_service.py`
- `backend/tests/test_query_api.py`
- `plans/FASE_4_BACKEND_CONSULTA_AGREGACAO.md`
- `plans/PLANO_GLOBAL_BACKEND_MULTI_CLIENTE.md`

## Validacoes

- `python -m pytest`: 18 passed.
- Supabase real:
  - BHS `wid-bhs-receita-canal`: 200, dados reais.
  - ACME `wid-acme-pedidos-canal`: 200, dados reais diferentes.
  - BHS com filtro `channel=Online`: 200, 1 linha.
  - BHS tentando widget ACME: 404.
  - filtro nao permitido `branch`: 400.
- `npm.cmd run build`: ok, com warning de chunk grande Vite.

## Decisoes

- Sem SQL, schema, tabela ou campo livre vindo do frontend.
- Backend resolve tenant schema.
- Identificadores passam por regex + quote.
- Valores de filtros usam parametros.
- RLS continua defesa em profundidade; backend ainda valida tenant/permissao antes da query.

## Pendencias Futuras

- Fase 5: adaptar frontend para consumir `/api/v1/query`.
- Fase 7: autenticação JWT/Supabase Auth final.
- Otimizar chunk grande do frontend quando entrar fase de performance.
