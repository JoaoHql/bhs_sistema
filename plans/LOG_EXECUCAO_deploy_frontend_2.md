# Log de execucao - Deploy frontend (2a rodada)

## 2026-08-07 - Deploy frontend: painel de dados, edicao de menu, ajustes visuais

Escopo:

- Analise de 9 arquivos modificados (7 frontend + 2 novos)
- Correcao de 4 erros de build: imports nao usados (RefreshCw, isSyncing, lastUpdated, syncNow) + prop `title` invalida em lucide Icon
- Build local com `tsc -b && vite build` (555ms)
- Commit e push para `origin main` — Vercel publica automaticamente

Arquivos alterados:

- `src/features/configuracoes/views/ConfiguracoesView.tsx` — nova aba "Dados" com UpdatesPanel
- `src/features/configuracoes/components/UpdatesPanel.tsx` — novo componente de status de atualizacao
- `src/services/updatesApi.ts` — novo servico para API de updates
- `src/features/templates/combo-simulator/ComboSimulatorTemplate.tsx` — ajustes de espacamento (p-4, gap-4)
- `src/features/templates/sales-projection/SalesProjectionTemplate.tsx` — slider com classe range-slider-smooth
- `src/index.css` — estilos customizados para range slider sem borda preta
- `src/layouts/DashboardLayout.tsx` — remocao da barra de sync, esconde filtros em Simuladores
- `src/layouts/Sidebar.tsx` — modo edicao de menu com botao "Salvar ordem"
- `src/types/index.ts` — tipos UpdateRun, AreaUpdateStatus, RefreshRequest, RefreshResponse

Validacao:

- `npm run build` passou apos correcoes (tsc + vite build, 555ms)
- `git push origin main` confirmado (a3dd125)
- Deploy na Vercel automatico — verificar painel Vercel para confirmar Ready
