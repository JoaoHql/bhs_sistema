# Log de Execucao - Fase 3

Data: 2026-07-06

## Escopo executado

- Criado motor de configuracao versionada por cliente.
- Supabase `app_core.published_versions` agora suporta `draft`, `validated`, `published`, `archived`.
- Criado indice parcial para impedir mais de uma versao `published` por cliente.
- Criados snapshots publicados diferentes para `bhs-demo` e `acme-demo`.
- Backend FastAPI passou a usar repository real quando `BHS_DATABASE_URL` existe.
- Mantido fallback mock para desenvolvimento/testes sem banco.
- Criados endpoints internos:
  - `GET /api/v1/internal/clients/{client_slug}/versions`
  - `POST /api/v1/internal/clients/{client_slug}/versions/draft`
  - `POST /api/v1/internal/clients/{client_slug}/versions/{version}/validate`
  - `POST /api/v1/internal/clients/{client_slug}/versions/{version}/publish`
  - `POST /api/v1/internal/clients/{client_slug}/versions/{version}/rollback`
  - `POST /api/v1/internal/clients/{client_slug}/versions/{version}/archive`

## Arquivos principais

- `backend/app/repositories/config_repository.py`
- `backend/app/repositories/config_repository_protocol.py`
- `backend/app/services/config_validation_service.py`
- `backend/app/services/version_service.py`
- `backend/app/api/v1/endpoints/config_versions.py`
- `backend/app/schemas/config_version.py`
- `supabase/migrations/20260706193000_phase_3_config_versions.sql`
- `backend/tests/test_versioning_service.py`

## Validacoes

- MCP Supabase liberado e usado.
- Migration aplicada com sucesso no projeto `txnkyneyvngyswoxqhsl`.
- API real contra Supabase:
  - BHS: `GET /modules` retornou `Base de Dados` e 2 modulos.
  - ACME: `GET /modules` retornou `Painel ACME` e 1 modulo.
  - BHS acessa `demo-vendas`: 200.
  - BHS acessa `acme-vendas`: 404.
- Fluxo interno real:
  - criar draft: 201.
  - validar draft: valido.
  - publicar draft: published.
  - rollback para v1: published.
- Banco:
  - `duplicate_published_clients = 0`.
  - `bhs-demo` v1 publicada, v2 arquivada.
  - `acme-demo` v1 publicada.
- Backend: `python -m pytest` com 11 testes passando.
- Frontend: `npm.cmd run build` passou.

## Observacoes

- Repository real usa `psycopg` sincronico dentro de `asyncio.to_thread` para funcionar corretamente no Windows e evitar bloqueio direto do event loop.
- Endpoints internos usam protecao temporaria por usuario admin e `BHS_INTERNAL_API_TOKEN` quando configurado. Endurecimento completo fica para a fase de auth/seguranca.
