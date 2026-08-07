# Backend Fase 1

Fundacao FastAPI para validar contratos entre frontend e backend sem conectar no Supabase real.

## Rodar localmente

```bash
cd backend
python -m pip install -e ".[dev]"
python -m uvicorn app.main:app --reload
```

Endpoints iniciais:

- `GET /api/v1/health`
- `GET /api/v1/me`
- `GET /api/v1/modules`
- `GET /api/v1/screens/{screen_id}`

## Regras desta fase

- Sem Supabase real.
- Sem login real.
- Sem SQL vindo do frontend.
- Sem pagina React por cliente.
- Configuracao mockada representa o contrato futuro.

## Frontend com API de configuracao

Por padrao o frontend segue com a configuracao local. Para testar consumo da API:

```bash
VITE_CONFIG_API_ENABLED=true VITE_API_BASE_URL=http://localhost:8000 npm run dev
```

## Variaveis de producao

- `BHS_ENVIRONMENT=production`
- `BHS_DATABASE_URL`
- `REDIS_URL` (cliente async para rate limit e cache; aceita `redis://` ou `rediss://`)
- `BHS_JWT_SECRET` (minimo 32 caracteres e diferente do valor local)
- `BHS_DEV_MOCK_AUTH=false`
- `BHS_API_CORS_ORIGINS` (origens HTTPS explicitas, sem localhost ou `*`)
- `BHS_INTERNAL_API_TOKEN`
- `BHS_OPENAI_API_KEY` (opcional; usada somente pelo backend)
- `BHS_DB_POOL_MIN_SIZE=1`, `BHS_DB_POOL_MAX_SIZE=10`, `BHS_DB_POOL_MAX_WAITING=20` e `BHS_DB_POOL_TIMEOUT_SECONDS=10` (limites por processo; ajuste conforme o limite de conexoes do banco)
- `BHS_WHATSAPP_REQUEST_TIMEOUT_SECONDS=15` e `BHS_WHATSAPP_CONNECT_RETRIES=1` (retry somente na abertura de conexao; POST nao e repetido apos resposta/timeout)

Em producao, configuracao JWT, CORS, mock auth ou token interno inseguros impedem a inicializacao.

## Redis

Redis e opcional para a disponibilidade da aplicacao: sem `REDIS_URL`, ou se o provedor estiver indisponivel, o backend atende pela origem e `/api/v1/health/ready` retorna `degraded`. Com Redis ativo, aplica limites por minuto em login, IA, consultas, WhatsApp e administracao; os endpoints retornam headers `X-RateLimit-*`. Cache de modulos e telas usa TTL de 60 segundos e e invalidado nas escritas de configuracao do tenant.

## Capacidade de consultas

O pool de conexoes tem fila limitada: quando saturado, consultas retornam `503 service_unavailable` em vez de acumular trabalho indefinidamente. O catalogo do simulador usa a projeção de custo ja materializada pelo tenant; a migration deve manter um dos contratos `simulador_produtos` ou `vw_simulador_produtos` com os campos publicados.
