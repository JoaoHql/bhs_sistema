# Log de execucao - Deploy conjunto frontend e backend (3a rodada)

## 2026-08-10 - Publicacao frontend e backend

Escopo:

- Preflight conforme `docs/OPERACAO_PRE_DEPLOY.md`
- Correcao do isolamento Redis na suite de testes
- Atualizacao do teste de idempotencia WhatsApp para o contrato atual com `tenant_schema`
- Commit e push para `origin/main`
- Atualizacao da copia Git na VPS preservando `backend/.env`
- Rebuild e recriacao do container backend
- Nenhuma migration, carga ou sincronizacao de banco executada

Arquivos alterados:

- `backend/app/main.py` — habilita DELETE no CORS
- `backend/app/repositories/query_repository.py` — agrega linhas duplicadas por data na projecao
- `backend/tests/conftest.py` — isola Redis nos testes
- `backend/tests/test_whatsapp_reliability.py` — atualiza chamada com schema do tenant
- `src/App.tsx`
- `src/components/shared/GlobalTopLoader.tsx`
- `src/components/shared/TenantLoadingModal.tsx`
- `src/components/shared/TenantLoadingState.tsx`
- `src/features/templates/sales-projection/SalesProjectionTemplate.tsx`
- `src/features/templates/sales-projection/adapters/gelobelSalesProjectionAdapter.ts`
- `src/features/vendas/views/SalesProjectionTenantView.tsx`
- `src/hooks/useTenantData.ts`
- `src/layouts/DashboardLayout.tsx`
- `src/services/apiClient.ts`
- `src/services/tenantDataCache.ts`
- `src/store/dashboardStore.tsx`

Validacao:

- Backend: `134 passed` em `python -m pytest`
- Backend: `python -m compileall app` passou
- Frontend: `npx tsc --noEmit` passou
- Frontend: `npm.cmd run build` passou
- Smoke Gelobel de catalogo: passou (`surfaces=5`, 20 leituras, concorrencia 5)
- Smoke API legado: pendente; `ops/smoke_api.py` ainda envia `Bearer email:slug`, enquanto a API atual exige token real de login; retornou 401 nas rotas autenticadas
- Git: commit `05c1eaa` enviado para `origin/main`
- VPS: container `bhs_sistema-backend-1` recriado e `healthy`
- Health local na VPS: live e ready `200`, Redis `ok`
- Health publico: `https://bhsgestaocompowerbi.com.br/api/v1/health/live` e `/ready` `200`, Redis `ok`
- CORS publico: preflight com `DELETE` respondeu `200` e metodo permitido
- Frontend publico: `https://bhs-sistema.vercel.app/` respondeu `200` pelo Vercel com `<title>BHS Sistemas</title>`
- O dominio `https://bhsgestaocompowerbi.com.br/` continua apontando para o webhook/API e retorna `Servidor Webhook OK!`; a API publica permanece validada em `/api/v1/health`

Pendencias:

- Atualizar `ops/smoke_api.py` para autenticar via `/api/v1/auth/login` antes de testar endpoints protegidos
- Confirmar no painel Vercel que o deployment do commit `05c1eaa` esta `Ready` e que o dominio esperado esta associado ao projeto frontend
- Validar manualmente login Gelobel, cinco modulos, reload e persistencia
