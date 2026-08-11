# Fase 2 — Execução

Data: 2026-07-26.

Escopo: template reutilizável, filtros globais e cenários da Projeção de Vendas Gelobel.

Arquivos: `src/features/templates/sales-projection/`, `src/features/vendas/views/SalesProjectionTenantView.tsx`, catálogo e referência operacional.

Validação:

- `npm.cmd run build`: aprovado.
- `node scripts/test_specialized_dashboards.mjs`: aprovado.
- `python ops/config_cli.py --tenant-file configs/tenants/gelobel.yaml build-snapshot`: aprovado, sem erros.
- Smoke estático: rota `projecao-vendas`, módulo `gestao-bi`, template, filtros e velocímetros confirmados.

Limite da validação visual: o runtime local apresentou a tela de login; não foram usadas credenciais para entrar.

## Fase 3 — Validação operacional autenticada

Data: 2026-07-27.

Correções necessárias:

- O endpoint de Projeção deixou de aplicar a validação genérica de schemas legados; agora confirma a existência de `projecao_vendas_diaria`.
- A tela ignora o valor inicial legado de período (`Jun/2026`) até receber opções no padrão `YYYY-MM`.

Validação MASTER Gelobel:

- Acesso confirmado como Administrador Gelobel.
- Menu preservou Simuladores, Simulador de Combos, Mensagens, Disparos no WhatsApp, Gestão (BI) e Configurações.
- Filtros reais: junho/2026 e Aurora retornaram 30 dias e valores filtrados.
- Cenários: quantidade, faturamento e meta recalcularam colunas correspondentes; valores restaurados para `0%`.
- Recarga preservou sessão, navegação e tela publicada após o carregamento inicial.
- Console não apresentou erros da aplicação; apenas avisos transitórios do Recharts durante resize.
- `npm.cmd run build`, `python -m compileall -q backend/app` e `python -m pytest backend/tests/test_query_service.py -q`: aprovados.

## Fase 4 — Projeção de quantidade por dia equivalente

Data: 2026-07-27.

Escopo: `Qtd. Proj Vendas` passou a usar a média dos quatro dias anteriores com o mesmo dia da semana, filtrada pela Empresa, e então aplicar o cenário de quantidade.

Arquivos: `backend/app/repositories/query_repository.py`, `src/types/index.ts`, `src/features/templates/sales-projection/types.ts`, `src/features/templates/sales-projection/SalesProjectionTemplate.tsx` e plano.

Validação:

- Consulta somente-leitura para Aurora/junho-2026: 30 dias, quatro referências equivalentes e projeção calculada confirmados.
- Mês inicial jul/2024: 31 projeções e percentuais de quantidade ausentes, sem zero artificial.
- `python -m compileall -q backend/app`, `npm.cmd run build` e `python -m pytest backend/tests/test_query_service.py -q`: aprovados.

## Fase 5 — Projeção de faturamento por dia equivalente

Data: 2026-07-27.

Escopo: `R$ Projetado` passou a usar a média de faturamento dos quatro dias anteriores com o mesmo dia da semana, filtrada pela Empresa, e então aplicar o cenário de ticket médio.

Arquivos: `backend/app/repositories/query_repository.py`, `src/types/index.ts`, `src/features/templates/sales-projection/types.ts`, `src/features/templates/sales-projection/SalesProjectionTemplate.tsx` e plano.

Validação:

- Consulta somente-leitura para Aurora/junho-2026: 30 dias, quatro referências equivalentes e faturamento projetado confirmados.
- Mês inicial jul/2024: 31 faturamentos projetados e percentuais ausentes, sem zero artificial.
- `python -m compileall -q backend/app`, `npm.cmd run build` e `python -m pytest backend/tests/test_query_service.py -q`: aprovados.

## Fase 6 — Redução sutil dos velocímetros

Data: 2026-08-10.

Escopo:

- Confirmado o ajuste aplicado no componente `Gauge` de `SalesProjectionTemplate`.
- Mantidos raio 96, espessura 20, viewBox 280x125, largura máxima 260px e espaçamentos compactos.
- Preservadas cores, marcador de destino, fórmulas de `maximum`, grid responsivo e classes mobile.
- Atualizado o plano com os critérios comprovados e a pendência de validação visual autenticada.

Arquivos alterados:

- `plans/PLANO_CORRECAO_PROJECAO_VENDAS_GELOBEL.md`
- `plans/logs_projecao_vendas_gelobel/FASE_2_EXECUCAO.md`

Validação:

- `npm run build` — OK (`tsc -b` e `vite build`, 2456 módulos transformados).
- Validação visual em navegador autenticado e medição real da viewport da tabela permanecem pendentes; não houve deploy nem acesso à infraestrutura externa.
