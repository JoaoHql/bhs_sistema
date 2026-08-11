## Fase 4: Backend de Consulta e Agregacao

Status: concluida
Data de criacao: 2026-07-06
Data de conclusao: 2026-07-07

Checklist resumido para validacao:

- [x] Contratos Pydantic de query criados.
- [x] Endpoint `POST /api/v1/query` criado e registrado.
- [x] `QueryService` valida usuario, cliente, permissao, tela, widget, filtros e fonte.
- [x] Repository resolve tenant schema e executa consulta real.
- [x] Query builder seguro usa allowlist e parametros.
- [x] Chart, KPI e tabela simples suportados.
- [x] Filtros permitidos aplicados no backend.
- [x] Consultas invalidas bloqueadas.
- [x] Isolamento BHS/ACME validado.
- [x] Testes backend criados e passando.
- [x] Supabase real validado.
- [x] Frontend build validado.
- [x] `python summarize.py` executado no fechamento.

## Objetivo

Criar o endpoint real de consulta de dados (`POST /api/v1/query`) e o motor seguro de agregacao para alimentar graficos, KPIs e tabelas a partir dos schemas tenant no Supabase/Postgres.

Nesta fase, o frontend continua preservado visualmente, mas a autoridade de dados sai do navegador e passa para o backend. O frontend nao pode escolher schema, tabela, SQL, campos livres ou fonte de dados fora da configuracao publicada.

## Checklist de Execucao

- [x] Criar contrato Pydantic de request/response para `POST /api/v1/query`.
- [x] Criar endpoint `backend/app/api/v1/endpoints/query.py`.
- [x] Registrar rota no router v1.
- [x] Criar `QueryService` com validacao de usuario, cliente, permissao, tela, widget, filtros e fonte.
- [x] Criar camada repository para resolver cliente, tenant schema, fonte de dados e executar consulta.
- [x] Criar construtor de SQL seguro baseado em allowlist, nunca em payload livre.
- [x] Suportar graficos com dimensoes e metricas (`sum`, `count`, `avg`).
- [x] Suportar KPI card.
- [x] Suportar tabela simples com colunas permitidas e limite obrigatorio.
- [x] Aplicar filtros globais/tela apenas se existirem em `allowed_filters`.
- [x] Bloquear campo/filtro/widget/tela/fonte inexistente ou nao publicada.
- [x] Garantir isolamento BHS/ACME com dados diferentes pelo mesmo endpoint.
- [x] Criar testes unitarios do motor de query.
- [x] Criar testes de API para sucesso, bloqueio cross-client, campo invalido e filtro invalido.
- [x] Validar contra Supabase real com `BHS_DATABASE_URL`.
- [x] Rodar `python -m pytest`.
- [x] Rodar `npm.cmd run build`.
- [x] Rodar `python summarize.py` ao fechar a fase.

## Decisoes Fixadas

- Backend resolve tenant por usuario/cliente, usando `app_core.clients.tenant_schema`.
- Schemas tenant continuam privados para cliente; sem expor via Data API para `anon`/`authenticated`.
- Query usa conexao backend direta com Postgres.
- `screen_id` e `widget_id` podem vir do frontend; schema/tabela/campo livre/SQL nao podem.
- Campo so entra no SQL se existir no widget publicado e na allowlist de `app_core.data_sources`.
- Filtro so entra no SQL se existir na tela/widget publicado e em `allowed_filters`.
- `dataSourceId` do widget publicado e autoridade da fonte; frontend nao escolhe outra fonte.
- Resultado volta pronto para renderizar, no formato esperado pelo `DynamicChart` e pelos componentes atuais.

## Contrato Previsto

Endpoint:

```http
POST /api/v1/query
```

Headers temporarios da fase atual:

```http
x-user-email: admin@bhs.demo
x-client-slug: bhs-demo
```

Request:

```json
{
  "screenId": "demo-vendas",
  "widgetId": "chart-receita-canal",
  "filters": {
    "channel": "Online"
  },
  "limit": 100
}
```

Response para chart:

```json
{
  "screenId": "demo-vendas",
  "widgetId": "chart-receita-canal",
  "dataSourceId": "vendas",
  "kind": "chart",
  "rows": [
    {
      "channel": "Online",
      "Receita": 18000
    }
  ],
  "metadata": {
    "clientSlug": "bhs-demo",
    "rowCount": 1,
    "appliedFilters": ["channel"]
  }
}
```

## Arquitetura Alvo

Arquivos novos previstos:

- `backend/app/api/v1/endpoints/query.py`
- `backend/app/schemas/query.py`
- `backend/app/services/query_service.py`
- `backend/app/repositories/query_repository.py`
- `backend/app/repositories/query_builder.py`
- `backend/tests/test_query_service.py`
- `backend/tests/test_query_api.py`

Arquivos existentes a alterar:

- `backend/app/api/v1/router.py`
- `backend/app/dependencies/services.py`
- `backend/app/repositories/config_repository_protocol.py`
- `backend/app/repositories/config_repository.py`
- `backend/app/repositories/mock_config_repository.py`
- `backend/app/core/errors.py` se precisar erro 400 padronizado.

Frontend nesta fase:

- Nao refatorar telas visuais.
- Nao substituir todos os mocks ainda.
- No maximo criar client TS opcional para `/query` se necessario para validacao.
- Adaptacao ampla do frontend fica para Fase 5.

## Fluxo Seguro

1. Receber `screenId`, `widgetId`, `filters`, `limit`.
2. Resolver usuario atual via dependencia existente.
3. Confirmar que usuario pertence ao cliente.
4. Carregar tela publicada do cliente.
5. Confirmar permissao de leitura da tela.
6. Localizar widget dentro da tela publicada.
7. Confirmar `dataSourceId` do widget.
8. Buscar fonte ativa do cliente em `app_core.data_sources`.
9. Resolver tenant schema pelo cliente no backend.
10. Validar tenant schema contra `app_core.validate_tenant_schema`.
11. Montar SELECT apenas com:
    - entidade do catalogo interno;
    - campos do widget publicado;
    - campos da allowlist;
    - filtros permitidos.
12. Executar query parametrizada.
13. Retornar linhas agregadas no contrato do widget.

## SQL Permitido

Permitido:

- `SELECT` em entidade catalogada (`tenant_view` ou `tenant_table`).
- Identificadores gerados pelo backend com quoting seguro.
- Valores de filtro sempre parametrizados.
- `GROUP BY` apenas em dimensoes publicadas.
- `LIMIT` com teto definido pelo backend.

Proibido:

- SQL cru vindo do frontend.
- `schema`, `table`, `entity`, `field` livre no request.
- `ORDER BY` em campo nao permitido.
- joins dinamicos nesta fase.
- expressao calculada livre vinda do cliente.
- fallback silencioso para dados mockados em caso de erro real.

## Escopo Funcional

### Chart

- Dimensoes: campos publicados em `chartConfig.dimensions`.
- Metricas: campos publicados em `chartConfig.metrics`.
- Agregacoes: `sum`, `count`, `avg`.
- Saida: uma linha por grupo.

### KPI

- Campo: `kpiConfig.field`.
- Agregacao: `sum`, `count`, `avg`.
- Saida: uma linha com label e valor.

### Table

- Fonte: `tableConfig.workspaceId`.
- Colunas: campos permitidos da fonte ou subset definido depois.
- Limite: default 100, maximo 500.
- Sem paginação complexa nesta fase.

## Modelagem Necessaria

Fase 2 ja criou:

- `app_core.clients`
- `app_core.data_sources`
- `tenant_bhs_demo`
- `tenant_acme_demo`
- `app_core.resolve_tenant_schema`
- `app_core.validate_tenant_schema`

Fase 4 pode precisar adicionar:

- indice em campos de filtro mais usados, se necessario;
- coluna opcional `default_limit` ou `max_limit` em `app_core.data_sources`, se o limite por fonte for necessario;
- migration de views tenant adicionais apenas se algum grafico principal exigir.

Regra: qualquer alteracao de schema deve vir com migration local em `supabase/migrations/` e validacao no Supabase real.

## Riscos Graves

- Vazamento cross-client por schema resolvido errado.
- SQL injection por identificador montado com string livre.
- Widget publicado apontar para campo removido do tenant.
- Frontend continuar aplicando filtro critico local e mascarar falha do backend.
- Supabase Data API expor schema/tabela por grant indevido.
- RLS dar falsa sensacao de seguranca se backend usar role privilegiada sem validacao propria.
- Divergencia entre `allowed_fields` e views reais.
- `count` implementado em campo numerico quando deveria contar linhas.
- Agregacao devolver label inconsistente e quebrar `DynamicChart`.

## Mitigacoes Obrigatorias

- Teste BHS nao acessa widget/tela/dados ACME.
- Teste ACME recebe numeros diferentes de BHS para mesma tela/shape.
- Teste filtro nao permitido retorna erro 400/403, nao ignora filtro.
- Teste campo adulterado no request nao e aceito porque request nao aceita campo livre.
- Query builder com quoting de identificadores e parametros separados.
- Teto de `limit`.
- Log de erro deve conter cliente/tela/widget, mas nao vazar SQL completo ao frontend.

## Validacoes de Aceite

- `POST /api/v1/query` retorna dados reais para grafico publicado de BHS.
- `POST /api/v1/query` retorna dados reais diferentes para ACME.
- BHS tentando consultar tela/widget exclusivo ACME recebe 404 ou 403.
- Filtro `channel=Online` altera resultado corretamente.
- Filtro inexistente retorna erro.
- Widget inexistente retorna erro.
- Tela inexistente retorna erro.
- Campo/fonte nao publicada nao entra na consulta.
- `python -m pytest` passa.
- `npm.cmd run build` passa.
- `python summarize.py` executado no fechamento.

## Fora de Escopo

- Autenticacao JWT/Supabase Auth final.
- Area administrativa visual.
- Refatoracao ampla do frontend.
- Onboarding completo de cliente.
- Cache distribuido.
- Joins configuraveis.
- Editor visual de queries.
- IA criando consultas automaticamente.

## Ordem Recomendada de Execucao

1. Criar schemas Pydantic de query.
2. Criar testes primeiro para contrato e bloqueios.
3. Criar query builder seguro.
4. Criar repository real usando `psycopg` sync via `asyncio.to_thread`, mantendo padrao da Fase 3.
5. Criar service com validacao completa.
6. Criar endpoint e registrar router.
7. Atualizar mock repository para testes sem Supabase.
8. Validar com dados reais BHS/ACME.
9. Rodar backend tests.
10. Rodar frontend build.
11. Atualizar log e mapas.
