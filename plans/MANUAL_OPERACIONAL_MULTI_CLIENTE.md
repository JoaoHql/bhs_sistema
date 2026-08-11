# Manual Operacional Multi-Cliente

## Principio

Toda operacao deve preservar isolamento por cliente: configuracao em `app_core`, dados no schema `tenant_<slug_normalizado>` e consultas sempre via backend.

## Criar Cliente

1. Definir `slug` em minusculo com hifens, exemplo `cliente-demo`.
2. Definir nome comercial e email do administrador.
3. Executar scaffolding sem gravar senha:

```powershell
$env:BHS_DATABASE_URL="postgresql://..."
python -m ops.tenant_ops scaffold-tenant --slug cliente-demo --name "Cliente Demo" --admin-email admin@cliente.demo --admin-name "Administrador Cliente" --fixtures --publish
```

4. Validar tenant:

```powershell
python -m ops.tenant_ops validate-tenant --slug cliente-demo
```

5. Gerar relatorio:

```powershell
python -m ops.tenant_ops published-report
```

6. Fazer smoke test com API local ativa:

```powershell
$env:BHS_API_BASE_URL="http://127.0.0.1:8000"
python -m ops.smoke_api --client-slug cliente-demo --user-email admin@cliente.demo
```

## Atualizar Template/Schema

1. Criar migration comum em `supabase/migrations/`.
2. Antes de aplicar, rodar:

```powershell
python -m ops.tenant_ops impact-report
```

3. Aplicar migration em ambiente controlado.
4. Rodar novamente:

```powershell
python -m ops.tenant_ops impact-report
```

5. Se algum cliente aparecer em `blockingIssues`, bloquear publicacao e corrigir schema/configuracao antes de seguir.

## Monitoramento Minimo

- Health da API: `GET /api/v1/health`.
- Erros por rota: logar rota, status, client_slug e request_id.
- Latencia critica: `/api/v1/query` acima de 1500 ms.
- Falhas por cliente: agrupar por `clientSlug`.
- Widget quebrado: registrar `screen_id`, `widget_id`, `dataSourceId`.
- Publicacao/validacao: auditar `publish`, `rollback`, `archive`, `validation_failed`.

## Playbooks

### Erro em Tela

1. Confirmar cliente e usuario.
2. Chamar `GET /api/v1/screens/<screen_id>`.
3. Verificar se a tela existe na configuracao publicada.
4. Rodar `published-report`.
5. Se nao existir, criar draft corrigido e publicar.

### Erro em Widget

1. Identificar `screen_id` e `widget_id`.
2. Rodar smoke do widget.
3. Verificar `dataSourceId` na configuracao publicada.
4. Rodar `validate-tenant`.
5. Corrigir fonte ou configuracao.

### Schema Tenant Invalido

1. Rodar `validate-tenant`.
2. Conferir objetos obrigatorios em `app_core.tenant_schema_requirements`.
3. Aplicar migration/template faltante.
4. Rodar `impact-report`.

### Publicacao Errada

1. Nao editar banco manualmente.
2. Usar endpoint interno de rollback da versao anterior.
3. Rodar smoke test do cliente.
4. Registrar causa no log de operacao.

### Cliente Sem Dados

1. Validar schema.
2. Consultar quantidade de registros nas tabelas tenant.
3. Conferir fonte em `app_core.data_sources`.
4. Carregar dados ou fixtures controladas.
5. Reexecutar smoke.

## Limites

- Nao passar schema/tabela/campo pelo frontend.
- Nao gravar `DATABASE_URL` em arquivo.
- Nao publicar configuracao sem validar.
- Nao aplicar migration comum sem relatorio de impacto.

