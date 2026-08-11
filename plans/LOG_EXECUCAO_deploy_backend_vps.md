# Log de execucao - Deploy backend na VPS

## 2026-08-07 - Deploy backend BHS

Escopo:

- Commit inicial do backend no Git (120 arquivos, estava como untracked)
- Atualizacao do `.gitignore` com regras Python (`__pycache__/`, `*.py[cod]`, `*.egg-info/`)
- Push para `origin main`
- Conversao do deploy na VPS de copia manual para clone Git
- Preservacao do `backend/.env` e `integracao_supa/` durante a transicao
- Backup do diretorio antigo em `/www/wwwroot/bhs_sistema_old`
- Clone do repositorio `JoaoHql/bhs_sistema` para `/www/wwwroot/bhs_sistema`
- Restauracao do `compose.yml` (nao versionado) a partir do backup
- `docker compose up -d --build --force-recreate backend`
- Validacao de health local e publico

Arquivos alterados:

- `.gitignore` — adicionadas regras Python
- `backend/` — 120 arquivos novos (API completa)

Validacao:

- Build Docker: imagem `bhs_sistema-backend:latest` construida com sucesso
- Container: `bhs_sistema-backend-1` rodando, status healthy
- Health local: `curl http://127.0.0.1:8000/api/v1/health/live` → `{"status":"ok"}`
- Health local: `curl http://127.0.0.1:8000/api/v1/health/ready` → `{"status":"ok","redis":"ok"}`
- Health publico: `https://bhsgestaocompowerbi.com.br/api/v1/health/live` → `{"status":"ok"}`
- Health publico: `https://bhsgestaocompowerbi.com.br/api/v1/health/ready` → `{"status":"ok","redis":"ok"}`
- Redis: ok
- Uptime: 9 segundos

Pendencias:

- `compose.yml` ainda nao esta versionado — considerar adicionar ao Git
- Diretorio `/www/wwwroot/bhs_sistema_old` pode ser removido apos confirmacao do smoke test
