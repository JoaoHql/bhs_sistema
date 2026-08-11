# Log de execucao - Fase 1 Projecao de Vendas Gelobel

## 2026-08-10 - Filtro mes mais recente

Escopo:

- Confirmada inicializacao de `period` como `All` em modo API, preservando `Jun/2026` somente no modo mock.
- Confirmada sincronizacao da view para `displayData.month` quando o periodo atual nao existe nas opcoes reais da API.
- Confirmado comportamento do `DashboardLayout`: chip de periodo somente quando diferente de `All`; limpar e remover filtro retornam para `All`.
- Confirmada invalidacao de cache local por tela e invalidacao backend do prefixo de consultas do tenant apos atualizacao.
- Atualizado o plano com os itens comprovados e com a pendencia de validacao autenticada interativa.

Arquivos alterados:

- `plans/PLANO_CORRECAO_PROJECAO_VENDAS_GELOBEL.md`
- `plans/logs_projecao_vendas_gelobel/FASE_1_EXECUCAO.md`

Validacao:

- `python -m pytest backend/tests/test_query_api.py backend/tests/test_query_service.py` — 12 passed.
- `npm run build` — OK (`tsc -b` e `vite build`).
- Validacao autenticada no cliente Gelobel, reload real e troca interativa de empresa permanecem pendentes; nao houve deploy nem acesso a infraestrutura externa.
