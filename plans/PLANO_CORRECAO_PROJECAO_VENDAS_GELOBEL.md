# Plano: Correção — Projeção de Vendas Gelobel (Filtro, Gauges e Tabela)

Status: Fase 1 executada — validação autenticada pendente.
Origem: relato do cliente Gelobel validado por investigação em `SalesProjectionTenantView`, `dashboardStore`, `DashboardLayout`, `SalesProjectionTemplate` e `query_repository.fetch_sales_projection`.

Superfície afetada: `Gestão (BI) > Projeção de Vendas` (screen `projecao-vendas`), filtros globais no header (`Mês` / `Empresa`), barra `Filtros Ativos`, 3 velocímetros e tabela `Acompanhamento detalhado`.
Interação esperada: selecionar `Mês mais recente` leva ao mês real mais recente do banco (ex.: `2026-08`); gauges compactos com mais espaço para tabela; tabela com 1 linha por dia do mês, sem botões de expansão no rodapé.
Elementos que não podem mudar: IDs/rotas/permissões da tela, fórmulas de quantidade/faturamento/meta, `projecao_vendas_diaria` como fonte, demais módulos Gelobel.

Fora de escopo: novo gráfico, persistência de cenários, mudança de dados no banco fora do dedupe, alteração de Nginx/VPS.

## Diagnóstico consolidado

- **Filtro default junho:** `src/store/dashboardStore.tsx:514` inicializa `period='Jun/2026'` (legado mock) e `src/features/vendas/views/SalesProjectionTenantView.tsx:39` só sincroniza `setPeriod(displayData.month)` quando `period==='All'`. Como o valor inicial nunca é `All`, o header exibe `Junho 2026` e a barra `DashboardLayout.tsx:71,341-348` marca como filtro ativo; clicar em `Mês mais recente` (value `All`) dispara `month=undefined` → backend devolve `2026-08`, mas ao reabrir a tela o default volta a `Jun/2026`.
- **Gauges altos:** `SalesProjectionTemplate.tsx:53-54,80-81,341` — `r=105`, `SW=24`, `viewBox 0 0 280 135`, `max-w-[280px]` e `mt-5` comprimem a viewport da tabela (`tableMaxHeight = 44 + viewReportRows*41`).
- **Tabela:** footer `SalesProjectionTemplate.tsx:446-477` tem botões `Expandir View Report para 15/30` / `Restaurar Padrão` redundantes com o `<select>` do header (`365-376`). Duplicidade de linhas: backend `query_repository.py:347-397` gera `dates = generate_series(1º ao último dia)` + `left join current_day group by data_venda` e deveria retornar 1 linha/dia; sintoma `01/08/2026` com 3 linhas (Todas) / 2 linhas (1 empresa) e `05/08` com 3 linhas indica regressão observada em produção — hipótese principal: cache Redis `bhs:cache:tenant:gelobel:query:sales-projection:*` / `tenantDataCache` desatualizado + MV `mv_vendas_diarias_resumo` stale ou `empresa` mal normalizada; secundária: consumo acidental de `projecao_vendas_detalhada` sem `GROUP BY`. Reprodução exige inspeção `POST /api/v1/query/sales-projection` com `company=null` vs filtrada e contagem de `sales_date` únicos.

## Fase 1 — Filtro `Mês mais recente` reflete o mês real

Origem: pedido explícito do usuário (bug 1).

- [x] Ajustar inicialização do filtro global para não forçar `Jun/2026` em modo `api` (default `All` quando `isConfigApiEnabled() === true`, preservando `Jun/2026` apenas em mock sem config API).
- [x] Corrigir `SalesProjectionTenantView.tsx:39` para sincronizar quando o período atual não existe em `months`, sem quebrar `branch` (`line 40`).
- [x] Confirmar que `DashboardLayout` exibe o chip apenas para período diferente de `All` e que `Limpar Filtros` / `X` retorna a `All`.
- [x] Confirmar invalidação: o cache local pode ser invalidado por tela e o backend invalida o prefixo `bhs:cache:tenant:<slug>:query:` após atualização.

Observação: a validação autenticada interativa no cliente Gelobel permanece pendente nesta execução; não foi feito deploy nem acesso à infraestrutura externa.

Critérios de aceite:
- [x] Em modo API, a abertura inicia em `All` e a view sincroniza para o `available_months[0]` retornado pela API — não `Junho 2026` legado.
- [ ] Validar interativamente no cliente Gelobel que clicar em `Mês > Mês mais recente` mantém o mês real após reload; trocar para `Junho 2026` e voltar a `Mês mais recente` volta ao mês real.
- [ ] Validar interativamente no cliente Gelobel que a troca de empresa não regride o mês.

## Fase 2 — Redução sutil da altura dos velocímetros

Origem: pedido explícito do usuário (bug 2) — aumentar viewport da tabela.

- [x] Reduzir altura dos gauges em `SalesProjectionTemplate.tsx:Gauge` com ajuste mínimo: `r 105→96`, `max-w-[280px]→260px`, `viewBox 280x125`, `SW 24→20`, `mt-5→mt-3`, `px-5 pt-4 pb-3→px-4 pt-3 pb-2.5`, mantendo legibilidade, cores por `completionPct` e âncora do `destination`.
- [x] Manter grid `grid-cols-1 lg:grid-cols-3 gap-4` e `h-full`; fórmulas `maximum = max(dest*1.3, value*1.1, 1)` não foram alteradas.

Critérios de aceite:
- [x] Parâmetros implementados para redução aproximada de 10-15%, sem alteração da geometria funcional do arco ou do marcador.
- [ ] Confirmar visualmente no navegador autenticado que a tabela ganha linhas visíveis sem scroll na mesma viewport; essa validação requer execução interativa no cliente Gelobel.
- [x] Preservadas as classes mobile `sm:text-xl` e `whitespace-nowrap`; build sem erros.

Observação: não houve deploy nem validação visual autenticada nesta execução.

## Fase 3 — Tabela: remover expansão do footer e garantir 1 linha/dia

Origem: pedido explícito do usuário (bug 3, dois subpontos).

### 3A — Remover botões do rodapé
- [x] Remover bloco de botões `Expandir View Report para 15/30` / `Restaurar Padrão` em `SalesProjectionTemplate.tsx`, mantendo `Mostrando todos os N dias do mês` e o `<select>` de `Linhas visíveis sem rolagem` no header (`365-376`).
- [x] Preservar `viewReportRows`, `tableMaxHeight`, `columnConfig`, ordenação 3-estados e redimensionamento por arraste.

### 3B — Deduplicação: 1 linha por dia do mês
- [ ] Reproduzir via DevTools Network: `POST /api/v1/query/sales-projection` para `month=2026-08` com `company=null` e `company=<uma>`; confirmar `rows.length === dias_no_mes` e `sales_date` únicos. Se duplicado, inspecionar `mv_vendas_diarias_resumo` (`select empresa, data_venda, count(*) group by 1,2 having count>1`), normalização `trim(empresa)` e `REFRESH MATERIALIZED VIEW CONCURRENTLY`.
- [x] Assegurar que o caminho com MV e o fallback sem MV agregam por `data_venda`; backend normaliza duplicidades antes do retorno e o adapter (`gelobelSalesProjectionAdapter.ts`) agrupa por `sales_date` defensivamente.
- [x] Garantir `sortedRows.map(row => <tr key={row.date}>)` sem chaves duplicadas e exportação CSV baseada na mesma coleção deduplicada.

Critérios de aceite:
- [x] Rodapé da tabela sem botões de expansão; controle de linhas apenas no header.
- [ ] Confirmar em execução autenticada para `2026-08`: 31 linhas com Todas as empresas e 31 linhas com uma empresa, incluindo apenas uma ocorrência de `01/08/2026` e `05/08/2026`.
- [x] Colunas, ordenações e exportação permanecem preservadas; nenhum filtro de visibilidade foi alterado.

Observação: a confirmação interativa da resposta real da API de agosto, com Todas as empresas e uma empresa, permanece pendente sem sessão autenticada do cliente Gelobel.

## Fase 4 — Validação operacional autenticada e regressão

Origem: necessidade técnica indispensável (`AGENTS.md` — proteção contra regressões de tenant).

- [ ] Validar acesso MASTER Gelobel à tela em `Gestão (BI)`; alternar `Mês` e `Empresa` com opções reais e confirmar atualização conjunta de tabela + 3 gauges.
- [ ] Recarregar página, simular falha de endpoint opcional (cache indisponível) e confirmar fallback sem limpar módulos publicados.
- [ ] Smoke Gelobel obrigatório: `Mensagens`, `Disparos no WhatsApp`, `Simuladores`, `Simulador de Combos`, `Configurações` permanecem acessíveis; sidebar IDs/permissões inalterados.
- [ ] Build frontend passa (`npm run build`); testes backend de `fetch_sales_projection` passam quando aplicável.

Critérios de aceite:
- [ ] Sem erro no console da tela de projeção em nenhum dos cenários acima.
- [ ] Nenhum módulo/tela Gelobel desaparece após as correções.

## Rastreabilidade

Cada fase corresponde a solicitação explícita do usuário ou a necessidade técnica indispensável para não regredir tenant. Não validar apenas se o plano foi cumprido; validar se o plano representa fielmente os três bugs relatados.

## Logs

Registrar em `plans/logs_projecao_vendas_gelobel/FASE_N_EXECUCAO.md` (ou `plans/LOG_EXECUCAO_<descricao>.md` se isolado) com data ISO, escopo, arquivos alterados e validação (build, testes, smoke).
