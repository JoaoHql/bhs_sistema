# Log de Execucao: Fase 2

## 2026-07-06

Escopo:

- Criada migracao SQL local `supabase/migrations/20260706183000_phase_2_app_core_tenants.sql`.
- Tentativa MCP Supabase falhou por permissao no projeto.
- Aplicacao seguiu por conexao Postgres informada pelo usuario.

Validacao esperada:

- `app_core.validate_tenant_schema('tenant_bhs_demo') = true`
- `app_core.validate_tenant_schema('tenant_acme_demo') = true`
- `app_core.resolve_tenant_schema('bhs-demo') = tenant_bhs_demo`
- `app_core.resolve_tenant_schema('acme-demo') = tenant_acme_demo`

Validacao executada:

- Migracao aplicada no banco Supabase/Postgres.
- `tenant_bhs_demo`: valido.
- `tenant_acme_demo`: valido.
- `admin@bhs.demo -> bhs-demo`: permitido.
- `admin@bhs.demo -> acme-demo`: negado.
- `admin@acme.demo -> acme-demo`: permitido.
- `admin@acme.demo -> bhs-demo`: negado.
- RLS habilitado em tabelas `app_core` e tenants.
- Grants para `anon`/`authenticated` nos schemas tenant: `0`.
