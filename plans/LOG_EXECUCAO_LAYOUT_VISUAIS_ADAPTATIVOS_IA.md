# Registro de execução: layout de visuais adaptativos

## 2026-07-26 — Fase 1 concluída

- Escopo: contrato semântico de apresentação, catálogo central, fallback legado e validação de payload.
- Arquivos: `src/types/index.ts`, `src/config/widgetPresentation.ts`, `backend/app/schemas/widget.py`, `backend/tests/test_api_contracts.py`.
- Validação: `python -m pytest backend/tests/test_api_contracts.py -q` (16 aprovados); `npm.cmd run build` (aprovado); validação da Fase 1 sem itens pendentes.

## 2026-07-26 — Fase 2 concluída

- Escopo: consumo dos presets no dashboard dinâmico, altura de gráficos/tabelas/KPIs e reflow responsivo.
- Arquivos: `src/features/cadastros/views/DynamicCanvasView.tsx`, `src/components/shared/DynamicChart.tsx`, `src/config/widgetPresentation.ts`.
- Validação: build do frontend, 16 testes de contrato e 5 asserções do resolvedor; CSS gerado contém spans `md:col-span-3`, `4`, `6` e `9`.

## 2026-07-26 — Fase 3 concluída

- Escopo: seleção adaptativa de rótulos, observação segura de resize, formatação e margens para gráficos dinâmicos.
- Arquivos: `src/components/shared/DynamicChart.tsx`, `src/utils/chartLabels.ts`, `scripts/test_chart_labels.mjs`, `package.json`.
- Validação: `npm.cmd run test:chart-labels`, `python -m pytest backend/tests/test_api_contracts.py -q` (16 aprovados) e `npm.cmd run build`.

## 2026-07-26 — Fase 4 concluída

- Escopo: edição semântica no painel administrativo, prompt de IA restrito, validação antes da aplicação e templates atualizados.
- Arquivos: `src/features/configuracoes/views/AdminPainelPublicacaoView.tsx`, `src/components/shared/AskAIDrawer.tsx`, `src/services/openaiService.ts`, `src/services/layoutTemplates.ts`, `src/config/widgetPresentation.ts`.
- Validação: testes de regra/configuração, 16 testes de contrato e build do frontend aprovados.

## 2026-07-26 — Fase 5 concluída

- Escopo: inventário somente-leitura, normalização idempotente de snapshots, ciclo de draft/versão e regressão Gelobel.
- Arquivos: `backend/app/services/presentation_migration_service.py`, `backend/tests/test_presentation_migration_service.py`, `plans/MANUAL_CRIACAO_TELAS_GRAFICOS.md`.
- Validação: 27 testes backend, `npm.cmd run test:chart-labels` e `npm.cmd run build` aprovados; nenhuma versão publicada foi alterada.

## 2026-07-26 — Fase 6 em execução

- Escopo: avaliação dos dashboards especializados e extração de formatos compartilhados para iFood, Mercado Livre e Shopee.
- Arquivos: `src/utils/chartLabels.ts`, os três componentes de marketplace e `plans/AVALIACAO_DASHBOARDS_ESPECIALIZADOS.md`.
- Validação parcial: build, testes de formatação e smoke backend aprovados. Revisão visual autenticada permanece pendente; nenhuma publicação ou dado foi alterado.
- Decisão de escopo: a revisão visual será exclusivamente na versão modelo com massa mockada; conexões de dados reais, autenticação e tenant ficam fora da fase.
- Decisão do solicitante: aprovação visual manual dispensada. A regressão será comprovada por build e smoke automatizado dos três componentes mockados.
- Arquivos adicionais: `scripts/test_specialized_dashboards.mjs`, `package.json`.

## 2026-07-26 — Fase 6 concluída

- Validação: `npm.cmd run test:chart-labels`, `npm.cmd run test:specialized-dashboards` e `npm.cmd run build` aprovados.
- Critério dispensado: aprovação visual manual, conforme instrução explícita do solicitante.
