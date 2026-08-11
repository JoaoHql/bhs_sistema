# Fase 1 - Contratos e matriz de autorizacao

Data: 2026-07-13

Hierarquia unica: `EQUIPE > MASTER do tenant > USUARIO COMUM`.

- EQUIPE: conta administrativa compartilhada da BHS; administra somente MASTERs de tenant.
- MASTER do tenant: administra somente usuarios comuns do tenant derivado da identidade autenticada.
- USUARIO COMUM: usa somente a propria conta e as telas autorizadas.
- Nao existe operador da EQUIPE nem criacao de outra conta interna.

## Matriz de operacoes

| Operacao | Endpoint planejado | EQUIPE | MASTER tenant | USUARIO COMUM | Escopo efetivo |
|---|---|---:|---:|---:|---|
| Login | `POST /api/v1/auth/login` | sim | sim | sim | credenciais informadas |
| Identidade propria | `GET /api/v1/me` | sim | sim | sim | propria conta |
| Trocar propria senha | `POST /api/v1/auth/change-password` | sim | sim | sim | propria conta |
| Listar MASTERs | `GET /api/v1/internal/masters` | sim | nao | nao | todos os tenants |
| Criar MASTER | `POST /api/v1/internal/masters` | sim | nao | nao | tenant escolhido pela EQUIPE |
| Editar/status MASTER | `PATCH /api/v1/internal/masters/{id}` | sim | nao | nao | tenant do alvo |
| Redefinir senha MASTER | `POST /api/v1/internal/masters/{id}/reset-password` | sim | nao | nao | tenant do alvo |
| Listar usuarios comuns | `GET /api/v1/tenant/users` | nao | sim | nao | tenant do token |
| Criar usuario comum | `POST /api/v1/tenant/users` | nao | sim | nao | tenant do token |
| Editar/status usuario comum | `PATCH /api/v1/tenant/users/{id}` | nao | sim | nao | tenant do token |
| Redefinir senha comum | `POST /api/v1/tenant/users/{id}/reset-password` | nao | sim | nao | tenant do token |
| Substituir permissoes | `PUT /api/v1/tenant/users/{id}/permissions` | nao | sim | nao | usuario e telas do tenant do token |

Regras contratuais:

- Somente `TenantMasterCreateRequest`, usado pela EQUIPE, recebe `clientSlug`.
- Contratos de usuario comum rejeitam `client_id`, `clientSlug`, `roles`, `is_staff` e campos extras.
- MASTER do tenant nao pode promover usuario, criar outro MASTER ou escolher tenant.
- EQUIPE nao recebe contrato para criar, redefinir ou configurar usuario comum.
- Senha temporaria usa modos mutuamente exclusivos `generated` ou `defined`.
- Resposta com senha gerada e de exibicao unica e nao deve ser armazenada no frontend.

## Endpoints existentes por permissao de tela

| Metodo | Endpoint atual | Acesso exigido | Estado atual |
|---|---|---|---|
| GET | `/api/v1/modules` | `read` | filtra telas liberadas |
| GET | `/api/v1/screens/{screen_id}` | `read` | validado pelo `ScreenService` |
| POST | `/api/v1/query` | `read` | validado pelo `QueryService` |
| POST | `/api/v1/query/sales-overview` | `read` | mapeado; enforcement pendente da Fase 3 |
| POST | `/api/v1/query/combo-simulator-products` | `read` | mapeado; enforcement pendente da Fase 3 |

Nao existe endpoint tenant mutavel por tela nesta versao. Todo endpoint futuro que altere dados funcionais deve exigir `write`; `write` inclui `read`. Endpoints internos de configuracao usam autorizacao da EQUIPE, nao permissao de tela.

## Evidencia automatizada

`backend/tests/test_user_management_contracts.py` valida:

- os tres niveis e dependencias separadas;
- rejeicao do operador da EQUIPE;
- impossibilidade de tenant/papel em contratos de usuario comum;
- matriz completa de operacoes;
- inventario `read`/`write` dos endpoints existentes;
- modos de senha temporaria e politica configuravel.
