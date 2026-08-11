# Fase 2: Modelagem Supabase/Postgres

Status: concluida em 2026-07-06.

## Escopo

- Criar `app_core`.
- Criar dois tenants de teste com schema separado.
- Definir catalogo multi-cliente de modulos, telas, widgets, filtros, fontes e versoes publicadas.
- Criar validacao estrutural dos schemas tenant.
- Garantir que frontend nao recebe schema livre: backend deve resolver por `client_slug`/usuario.

## Decisoes

- Schemas privados por cliente: `tenant_bhs_demo`, `tenant_acme_demo`.
- Configuracao da plataforma em `app_core`.
- Dados brutos de cliente ficam apenas no schema tenant.
- Sem grant para `anon`/`authenticated` nos schemas tenant nesta fase.
- `service_role` recebe acesso operacional; backend deve consultar por whitelist/catalogo.

## Aceite

- `app_core` criado.
- 2 clientes seedados.
- 2 schemas tenant criados.
- Template tenant aplicado.
- Funcao `app_core.validate_tenant_schema(text)` retorna `true` para ambos.
- Funcao `app_core.resolve_tenant_schema(text)` resolve schema por slug.
- Dados de tenant isolados por schema.

