# Plano de Melhorias — Multi-Tenant, Projeção de Vendas e Limpeza

> Baseado na avaliação de 2026-08-05 do projeto BHS Modelo.
> Branch: `codex/frontend-api-vps`

---

## Fase 1 — Correções de Arquitetura Multi-Tenant (segurança)

### 1.1 Desacoplar WhatsApp do hard-code `gelobel`

**Problema**: `whatsapp_service.py`, `whatsapp_repository.py` e tabelas WhatsApp usam `tenant_gelobel` fixo e `client.slug = 'gelobel'` no código. Qualquer novo cliente que precise de WhatsApp exige edição manual de SQL e código.

**Arquivos a alterar**:
- `backend/app/services/whatsapp_service.py` — remover `if actor.client_slug != "gelobel"` (linha ~22) e derivar schema via `resolve_tenant_schema(client_slug)` como os outros endpoints
- `backend/app/repositories/whatsapp_repository.py` — substituir `tenant_gelobel.*` por schema qualificado via parâmetro `tenant_schema`; remover `client.slug = 'gelobel'` (linhas ~87, 143) e usar `client_id` parametrizado
- `backend/app/api/v1/endpoints/whatsapp.py` — passar `tenant_schema` resolvido para o repositório (já tem `_tenant_id` — renomear para `tenant_schema`)
- `supabase/migrations/20260721230000_gelobel_whatsapp_automacoes.sql` — criar uma nova migration que permite criar essas tabelas em qualquer schema de tenant (não só `tenant_gelobel`)

**Validação**: executar os endpoints de WhatsApp autenticado como Gelobel e confirmar que os dados retornam iguais.

### 1.2 Centralizar validação de schema em toda rota

**Problema**: `config_repository.get_tenant_catalog` usa `client.tenant_schema` direto do banco, sem passar pelo regex `^tenant_[a-z0-9_]+$` de `quote_identifier`. Outras rotas também usam caminhos diferentes.

**Arquivos a alterar**:
- `backend/app/repositories/config_repository.py` — em `get_tenant_catalog`, validar `tenant_schema` com `validate_tenant_schema()` antes de usar
- `backend/app/repositories/query_repository.py` — garantir que `resolve_tenant_schema()` + `validate_tenant_schema()` seja chamado em **todas** as queries (auditar `fetch_combo_companies`, `fetch_combo_products`, etc.)
- Criar helper `get_validated_tenant_schema(client_slug: str) -> str` que faz resolve + validate + regex e usar em todos os repositórios

**Validação**: teste automatizado com slug malicioso (ex: `gelobel; drop table`) → deve rejeitar.

### 1.3 Revalidar `client.status` a cada request

**Problema**: um cliente suspenso após autenticação continua lendo dados em sessões já emitidas (só bloqueado no login e na consulta `resolve_request_client`).

**Arquivos a alterar**:
- `backend/app/dependencies/identity.py` — em `get_current_user`, após carregar o usuário, carregar também `client.status` e lançar 403 se `status = 'suspended'`
- `backend/app/repositories/config_repository.py` — `get_current_user` deve retornar `client_status` junto com os dados do usuário

**Validação**: suspender cliente Gelobel, tentar acessar endpoint autenticado → 403.

### 1.4 Generalizar `has_sales_projection_data` e incluir em `tenant_schema_requirements`

**Problema**: a tela de projeção só funciona para `tenant_gelobel`; a tabela `projecao_vendas_diaria` não está em `tenant_schema_requirements`, então um novo tenant precisa de migration manual.

**Arquivos a alterar**:
- `supabase/migrations/` — nova migration adicionando `projecao_vendas_diaria` a `app_core.tenant_schema_requirements` com `optional = true`
- `backend/app/repositories/query_repository.py` — `has_sales_projection_data` deve aceitar qualquer schema (remover restrição a `tenant_gelobel`)
- `backend/app/repositories/mock_query_repository.py` — remover o fallback que compara literalmente `tenant_gelobel`

**Validação**: criar um tenant demo com `projecao_vendas_diaria` vazia → tela carrega com dados zerados, sem erro.

---

## Fase 2 — Performance da Projeção de Vendas

### 2.1 Reescrever query principal eliminando N+1

**Problema**: o `left join lateral` que busca os últimos 4 dias com mesmo `isodow` roda 28–31 vezes por request, varrendo `projecao_vendas_diaria` a cada iteração.

**Arquivos a alterar**:
- `backend/app/repositories/query_repository.py` — `fetch_sales_projection` (linhas ~244–318)

**Abordagem**: substituir o `lateral join` por um CTE único que pré-agrega os últimos 4 isodow **antes** do join com a grade de datas:

```sql
with dates as (...),
current_day as (...),
previous_year as (...),
-- NOVO: pré-agrega os 4 últimos dias por isodow em uma passada
previous_weekdays_agg as (
  select extract(isodow from p.data_venda) as dow,
         p.data_venda,
         sum(p.quantidade_vendida) as qty,
         sum(p.valor_faturado) as revenue,
         row_number() over (partition by extract(isodow from p.data_venda) order by p.data_venda desc) as rn
  from <schema>.projecao_vendas_diaria p
  where p.data_venda < :m::date
    and (:company is null or p.empresa = :company)
  group by p.data_venda
),
previous_weekdays_scores as (
  select dow,
         avg(qty) filter (where rn <= 4) as quantity_average,
         avg(revenue) filter (where rn <= 4) as revenue_average
  from previous_weekdays_agg
  group by dow
  having count(*) filter (where rn <= 4) = 4
)
select ... from dates d
left join current_day c ...
left join previous_year py ...
left join previous_weekdays_scores pw on pw.dow = extract(isodow from d.data_venda)
order by d.data_venda
```

**Validação**: comparar resultado da query antiga vs nova com dados reais da Gelobel (devem ser idênticos).

### 2.2 Índices e ANALYZE

**Problema**: `distinct empresa` faz seq scan; filtro por `empresa` sem data não usa o índice `(data_venda, empresa)`.

**Arquivos a alterar**:
- `supabase/migrations/` — nova migration adicionando:
  ```sql
  create index if not exists projecao_vendas_diaria_empresa_idx
    on tenant_gelobel.projecao_vendas_diaria (empresa);
  create index if not exists projecao_vendas_diaria_data_empresa_idx
    on tenant_gelobel.projecao_vendas_diaria (data_venda desc, empresa);
  ```
- Rodar `analyze tenant_gelobel.projecao_vendas_diaria` pós-migration

**Validação**: `explain analyze` da query principal antes e depois — confirmar index scan onde antes era seq scan.

### 2.3 Debounce nos sliders + TTL no cache frontend

**Problema**: cada movimento de slider gera nova chave de cache e nova requisição ao backend; cache nunca expira.

**Arquivos a alterar**:
- `src/features/vendas/views/SalesProjectionTenantView.tsx` — adicionar `debounce` de ~300ms no envio dos parâmetros `quantityGrowthPct`, `revenueGrowthPct`, `goalGrowthPct`
- `src/services/tenantDataCache.ts` — adicionar TTL configurável (ex: 5min), expirar entradas antigas no `get` e no `cleanup`

**Validação**: mover slider rápido → apenas 1 requisição após parar; aguardar 6 min → cache invalida e nova requisição ao backend.

---

## Fase 3 — Melhorias Funcionais (Gelobel)

### 3.1 Sliders com projeção negativa

**Problema**: API aceita −99,99%, mas UI limita a 0–100%.

**Arquivos a alterar**:
- `src/features/templates/sales-projection/SalesProjectionTemplate.tsx` — `ScenarioInput`: `min={-50}` em vez de `min={0}`, labels ajustados ("Vendas subir" → "Variação nas vendas")

**Validação**: slider em −20%, widget mostra projeção 20% abaixo da média — velocímetros e percentuais devem recalcular corretamente.

### 3.2 Decidir e agir sobre `dim_calendar`

**Problema**: `dim_calendar` é obrigatório em `tenant_schema_requirements` mas não usado em lugar nenhum.

**Opções** (a decidir com o time):
- **A)** Remover `dim_calendar` dos `tenant_schema_requirements` e das migrations de scaffold (peso morto)
- **B)** Usar `dim_calendar` na projeção: substituir `generate_series` por `dim_calendar` com filtro `is_holiday`/`is_business_day` para projeção e meta mais realistas (excluir feriados dos 4 isodow, usar dias úteis para meta)

**Arquivos a alterar (opção B)**:
- `supabase/migrations/` — garantir `dim_calendar` com colunas `is_business_day boolean`, `is_holiday boolean` populadas
- `backend/app/repositories/query_repository.py` — `fetch_sales_projection`: usar `dim_calendar` no lugar de `generate_series`, filtrar `isodow` apenas em `is_business_day = true`
- `backend/app/services/query_service.py` — validar `dim_calendar` como dependência da tela de projeção

**Validação**: mês com feriado → projeção dos dias pós-feriado não puxa média do feriado como referência.

### 3.3 Conectar `PerformanceTab` forecast à `projecao_vendas_diaria`

**Problema**: a tela `PerformanceTab.tsx` exibe forecast mockado (1.05/1.1/1.15) sem ler dados reais.

**Arquivos a alterar**:
- `src/features/vendas/views/PerformanceTab.tsx` — substituir o `summary.totalTarget * 1.xx` por chamada real ao endpoint de projeção (ou reutilizar o hook `useTenantData` com `sales-projection`)
- Se a tela não deve ter projeção real, **remover o forecast mockado** completamente (dado fictício em tela de BI)

**Validação**: PerformanceTab mostra projeção baseada em `projecao_vendas_diaria` com sliders, ou o forecast é removido e a tela mostra só realizado.

---

## Fase 4 — Limpeza e Dívida Técnica

### 4.1 Remover código morto

**Arquivos a remover/limpar**:
- `src/features/templates/sales-projection/adapters/mockSalesProjectionAdapter.ts` — não usado no fluxo real
- `backend/app/repositories/mock_query_repository.py` — remover comparação literal `tenant_gelobel` (após 1.4)
- `supabase/migrations/` — remover seeds fictícios (`metricas_whatsapp_ficticias`, projeção seedada via migration) ou movê-los para `ops/seed_dev_data.py` separado

### 4.2 Corrigir cache de módulos publicados (colisão entre tenants)

**Problema**: `localStorage` de módulos publicados usa chave `bhs_published_modules_${user.id}`, ignorando o `client_slug` — colisão se o mesmo usuário entrar em tenants diferentes.

**Arquivos a alterar**:
- `src/store/dashboardStore.tsx` — `bhs_published_modules_${user.id}` → `bhs_published_modules_${tenantSessionKey(clientSlug, user.id)}`
- `src/hooks/useTenantData.ts` — verificar se há outros caches com o mesmo problema

**Validação**: login como usuário staff em Gelobel, depois em BHS Demo → módulos devem ser distintos.

### 4.3 Completar rollbacks ou documentar política

**Problema**: 1 arquivo de rollback para 25 migrations.

**Ação**: documentar em `supabase/README.md` que rollbacks não são suportados (política de "migrate forward only") e remover o arquivo de rollback único, **ou** completar rollbacks para as migrations críticas (fase 1 e 2).

### 4.4 Documentar padrão multi-tenant para novos desenvolvedores

**Arquivos a criar**:
- `docs/MULTI_TENANT.md` — explicando:
  - Estrutura `app_core` + `tenant_<slug>`
  - Como adicionar um novo cliente (`ops/tenant_ops.py scaffold-tenant`)
  - Como criar telas/tabelas por tenant (usar `resolve_tenant_schema`, nunca hard-codar slug)
  - Como criar migrations para tabelas de tenant (template SQL)
  - Checklist de segurança (nunca usar `client.tenant_schema` sem validar com `quote_identifier`)

---

## Ordem de Execução Recomendada

```
Fase 1 (arquitetura) → Fase 2 (performance) → Fase 3 (funcional) → Fase 4 (limpeza)
  │
  ├─ 1.2 (centralizar validação) — foundation para todo o resto
  ├─ 1.3 (client.status) — 1 arquivo, baixo risco
  ├─ 1.1 (WhatsApp) — maior esforço, maior ganho de arquitetura
  ├─ 1.4 (generalizar projeção) — desbloqueia tenants futuros
  │
  ├─ 2.3 (debounce + TTL) — frontend apenas, sem risco ao backend
  ├─ 2.2 (índices + ANALYZE) — migration segura, ganho imediato
  ├─ 2.1 (reescrita query) — maior ganho de performance, validar com dados reais
  │
  ├─ 3.1 (sliders negativos) — trivial, 1 arquivo
  ├─ 3.2 (dim_calendar) — decidir A ou B primeiro
  ├─ 3.3 (PerformanceTab) — decidir se conecta ou remove
  │
  └─ 4.1 → 4.2 → 4.3 → 4.4 (na ordem)
```

## Verificação Final (smoke test Gelobel)

Após todas as fases, validar:
1. Login com usuário Gelobel → módulos carregam
2. `Mensagens`, `Disparos no WhatsApp`, `Simuladores`, `Simulador de Combos`, `Configurações` — funcionando
3. `Projeção de Vendas` — sliders, velocímetros, tabela, exportação CSV
4. Mudar sliders → resposta em <500ms com cache quente
5. Suspender cliente no banco → 403 em endpoints autenticados
6. Criar tenant demo com `projecao_vendas_diaria` vazia → tela carrega sem erro
