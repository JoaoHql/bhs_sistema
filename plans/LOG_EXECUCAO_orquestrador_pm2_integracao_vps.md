# Log de execucao - Orquestrador PM2 para cargas diarias na VPS

## 2026-08-07

Escopo:

- Criado `integracao_supa/run_pipeline.py`: roda os 5 loads Gelobel em sequencia,
  em primeiro plano, com lock anti-concorrencia (fcntl POSIX / msvcrt Windows),
  log com timestamps, selecao de passos via `--steps` e status gravado em
  `plans/logs_integracao_vps/ultima_execucao.json`.
- Criado `integracao_supa/ecosystem.config.js` (PM2): cron `0 3 * * *`,
  `autorestart: false`, sem repeticao automatica apos falha.
- Criado `integracao_supa/requirements.txt` (`psycopg[binary]`, `mysql-connector-python`).
- Criado `integracao_supa/.env.example` (modelo de credenciais, sem valores reais).
- Criado `docs/INTEGRACAO_PM2_VPS.md` (guia de instalacao e operacao na VPS).
- `teste_mysql.py`: `criar_conexao()` agora carrega `integracao_supa/.env`
  automaticamente; senha default trocada por ficticia (`senha_ficticia_123`).
- `load_gelobel_produtos.py`, `load_gelobel_compprod.py`,
  `load_gelobel_projecao_vendas.py`, `load_gelobel_projecao_vendas_detalhada.py`,
  `load_simulador_catalogo.py`: agora leem `BHS_DATABASE_URL_DIRECT` /
  `BHS_DATABASE_URL` tambem de `integracao_supa/.env` (nao so `backend/.env`).
- `.gitignore`: adicionado `/integracao_supa/.env`.
- `integracao_supa/.env`: senha real removida do versionado (deixada vazia).

Arquivos alterados:

- `integracao_supa/run_pipeline.py` (novo)
- `integracao_supa/ecosystem.config.js` (novo)
- `integracao_supa/requirements.txt` (novo)
- `integracao_supa/.env.example` (novo)
- `docs/INTEGRACAO_PM2_VPS.md` (novo)
- `integracao_supa/teste_mysql.py`
- `integracao_supa/load_gelobel_produtos.py`
- `integracao_supa/load_gelobel_compprod.py`
- `integracao_supa/load_gelobel_projecao_vendas.py`
- `integracao_supa/load_gelobel_projecao_vendas_detalhada.py`
- `integracao_supa/load_simulador_catalogo.py`
- `integracao_supa/.env`
- `.gitignore`

Validacao:

- `python -m compileall -q integracao_supa` passou.
- `node --check integracao_supa/ecosystem.config.js` passou.
- `run_pipeline.py --help` e lock (adquirir/bloquear) testados localmente.
- Pipeline executado sem credenciais: falhou no passo 1 como esperado e gravou
  `ultima_execucao.json` com `status=failed:produtos`; fluxo de erro validado.
- Teste completo contra banco NAO executado localmente (sem acesso); sera feito
  na VPS em primeiro plano antes de agendar, conforme `docs/INTEGRACAO_PM2_VPS.md`.
- Artefatos de teste removidos (`run_pipeline.lock`, `ultima_execucao.json`).

Pendencias para o usuario na VPS:

- Subir a pasta `integracao_supa/` (e `supabase/migrations/`, `bases_gelobel/`)
  para `/www/wwwroot/bhs_integracao/`.
- Criar venv, instalar `requirements.txt`, preencher `integracao_supa/.env`.
- Rodar `run_pipeline.py` em primeiro plano; depois `pm2 start` + `pm2 save`.
