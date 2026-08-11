# Log de execucao - Deploy frontend na Vercel via merge na main

## 2026-08-07 - Deploy frontend BHS Sistemas

Escopo:

- Verificacao do runbook `docs/OPERACAO_PRE_DEPLOY.md`
- Confirmacao de `.env.production` apontando para `https://bhsgestaocompowerbi.com.br`
- Build local com `tsc -b && vite build`
- Correcao de 2 erros de TypeScript no `SalesProjectionTenantView.tsx` (useRef sem inicializador + callback sem retorno)
- Commit das alteracoes na branch `codex/frontend-api-vps` com 12 arquivos
- Merge na `main` com rebase (resolveu conflito na chave de cache `moduleCacheKey` em `dashboardStore.tsx`)
- Push para `origin main` — Vercel publica automaticamente a partir desse push

Arquivos alterados:

- `index.html` — titulo da pagina: "modelo" → "BHS Sistemas"
- `src/App.tsx` — estados de loading/erro com retry na configuracao
- `src/components/LoginScreen.tsx` — rebranding "Portal Antigravity" → "BHS Sistemas"
- `src/features/analises/components/PerformanceTab.tsx` — simplificacao: remocao de graficos, mantendo tabela de vendedores
- `src/features/templates/sales-projection/SalesProjectionTemplate.tsx` — sliders -50% a +100%, labels ajustados
- `src/features/templates/sales-projection/index.ts` — remove export do mockSalesProjectionAdapter
- `src/features/templates/sales-projection/adapters/mockSalesProjectionAdapter.ts` — removido
- `src/features/vendas/views/SalesProjectionTenantView.tsx` — debounce 300ms nos sliders, correcoes TS
- `src/services/tenantDataCache.ts` — TTL de 5 minutos, expiracao e invalidacao
- `src/store/dashboardStore.tsx` — estados de loading/erro/retry, cache local de modulos, logout em 401
- `.gitignore` — ajustes
- `README.md` — ajustes

Validacao:

- `npm run build` passou apos correcoes (tsc + vite build, 853ms)
- `git push origin main` confirmado (8cdf1ef)
- Deploy na Vercel deve ser verificado no painel: confirmar deployment `Ready` e testar login, navegacao e chamadas API
