# Log de execucao - Fix 400 WhatsApp Endpoints (Gelobel)

## 2026-08-06 - Correcao de validacao de schema tenant_gelobel

Escopo:

- Diagnosticado erro 400 nos endpoints `GET /api/v1/tenant/whatsapp/bootstrap` e `GET /api/v1/tenant/whatsapp/automations`
- Causa raiz: funcao `app_core.validate_tenant_schema` exigia tabelas `sales_orders`, `finance_transactions` e view `vw_sales_summary` como obrigatorias, mas o tenant `tenant_gelobel` nunca as possuiu (usa apenas modulos WhatsApp e Simuladores)
- Migrations `20260805120000` (coluna `optional`) e `20260805120200` (remover `dim_calendar`) nunca foram aplicadas no banco
- Solucao: adicionar coluna `optional`, remover `dim_calendar`, marcar `sales_orders`/`finance_transactions`/`vw_sales_summary` como `optional=true`, atualizar `validate_tenant_schema` para pular `optional=true`

Arquivos alterados:

- `supabase/migrations/20260806160000_optional_schema_requirements_all.sql` (nova migration)
- Banco Supabase: coluna `app_core.tenant_schema_requirements.optional` adicionada, 3 requisitos marcados como opcionais, `dim_calendar` removido, funcao `validate_tenant_schema` recriada

Validacao:

- `SELECT app_core.validate_tenant_schema('tenant_gelobel')` → `True` (antes era `False`)
- Endpoints testados: `GET /bootstrap` → 401 (auth, passou validacao de schema), mesmo para `/automations`
- A mudanca de 400 → 401 confirma que o schema passou na validacao e o fluxo chegou corretamente ao middleware de autenticacao

Pendencias:

- Nenhuma. Frontend com token JWT valido deve obter 200 em ambos os endpoints.
