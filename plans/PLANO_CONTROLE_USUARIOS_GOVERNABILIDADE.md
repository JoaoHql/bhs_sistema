# Plano Controle Usuarios e Governabilidade

Objetivo: implantar seguranca por JWT em backend FastAPI multi-tenant, garantindo que tenant, perfil e permissoes sejam resolvidos no servidor. Frontend nunca decide tenant. Cliente sem configuracao publicada ve apenas modulos estruturais permitidos.

## Decisoes Arquiteturais

- Estrategia final: JWT assinado pelo backend, bearer token em `Authorization`.
- Claims obrigatorias: `sub`, `email`, `is_staff`, `roles`, `client_slug` para usuario de cliente.
- Claims de confianca: `iss`, `aud`, `iat`, `exp`.
- Staff nao carrega `client_slug`; acesso interno depende de `is_staff=true`.
- Usuario de cliente sempre precisa de tenant no token e membership validada em `app_core`.
- Tela de login frontend ja esta ativa: `App.tsx` exibe `LoginScreen` quando `currentUser` e nulo, e `LoginScreen` usa `/api/v1/auth/login`.
- Backend resolve `client_id`, tenant schema, permissoes, telas, widgets e fontes.
- `x-client-slug` nao deve trocar tenant. Quando existir rota com `{client_slug}`, backend valida autorizacao.
- Schemas `tenant_*` seguem privados para frontend/Data API. Consulta passa por backend.

## Fase 1 - Plano e Contratos JWT

Status: concluida.

**Escopo**

- [x] Reestruturar plano em fases executaveis.
- [x] Definir claims JWT obrigatorias.
- [x] Definir regra staff vs usuario cliente.
- [x] Definir regra anti-cross-tenant.
- [x] Definir logs por fase em `plans/logs_plano_controle_governabilidade/`.

**Aceite**

- [x] Plano tem fases, checklist e criterio de aceite.
- [x] JWT nao depende de tenant vindo do frontend.
- [x] Staff e cliente possuem fluxo separado.

## Fase 2 - Backend JWT e Tenant Resolver

Status: concluida.

**Escopo**

- [x] Adicionar config de expiracao, issuer e audience JWT.
- [x] Gerar JWT no login com `sub`, `email`, `is_staff`, `roles` e `client_slug` quando aplicavel.
- [x] Validar issuer/audience/exp no decode.
- [x] Bloquear token de usuario cliente sem tenant.
- [x] Confirmar `sub` e `is_staff` contra usuario carregado do repository.
- [x] Exigir `is_staff=true` em endpoints internos.

**Aceite**

- [x] `/api/v1/auth/login` retorna token bearer com claims fortes.
- [x] `/api/v1/me` rejeita token invalido ou token cliente sem tenant.
- [x] Rotas internas nao aceitam apenas role `admin`; exigem staff real.

## Fase 3 - Governabilidade de Modulos e Sidebar

Status: pendente.

**Escopo**

- [x] Confirmar que tela de login frontend ja esta ativa e fora do escopo pendente desta fase.
- [ ] Em modo API real, sidebar renderiza menus dinamicos de `/api/v1/modules`.
- [ ] Ocultar menus mockados para cliente em API real.
- [ ] Staff ve apenas modulos estruturais internos quando cliente novo nao tem versao publicada.
- [ ] Client admin ve matriz de permissoes e telas publicadas do seu tenant.
- [ ] Operador ve somente telas concedidas.

**Aceite**

- [ ] Cliente novo nao ve dashboards mockados.
- [ ] Modo mock continua exibindo demonstracao completa.
- [ ] Teste frontend ou manual cobre staff, client admin e operador.

## Fase 4 - Auditoria e Cross-Tenant

Status: pendente.

**Escopo**

- [ ] Auditar login sucesso/falha.
- [ ] Auditar erro de permissao e tentativa cross-tenant.
- [ ] Validar que endpoints internos com `{client_slug}` bloqueiam usuario nao staff.
- [ ] Criar testes para troca indevida de tenant.
- [ ] Confirmar grants de `tenant_*` sem exposicao para `anon`/`authenticated`.

**Aceite**

- [ ] Tentativa cross-tenant gera `403` ou `401` e registro de auditoria.
- [ ] Smoke/API cobre token valido, invalido, expirado e tenant divergente.
- [ ] Relatorio de grants confirma schemas tenant privados.

## Fase 5 - Operacao

Status: pendente.

**Escopo**

- [ ] Documentar variaveis `BHS_JWT_SECRET`, `BHS_JWT_ACCESS_TOKEN_MINUTES`, `BHS_JWT_ISSUER`, `BHS_JWT_AUDIENCE`.
- [ ] Definir rotacao de segredo JWT.
- [ ] Definir processo de criacao de usuario staff/client admin/operador.
- [ ] Integrar onboarding tenant com publicacao inicial vazia.

**Aceite**

- [ ] Manual operacional permite subir ambiente sem segredo mock em producao.
- [ ] Novo tenant nasce sem telas dinamicas ate publicacao.
- [ ] Checklist de rollback e revogacao de token documentado.

## Validacoes Obrigatorias

- `python -m pytest backend/tests/test_auth_api.py backend/tests/test_security_audit.py`
- `python -m pytest backend/tests`
- `python summarize.py`

## Riscos

- Segredo JWT default e aceitavel so em local.
- Cliente com role `admin` nao equivale a staff.
- Claim `client_slug` e dado de roteamento; autorizacao real vem do repository.
- Modo mock deve ficar isolado de producao por `BHS_ENVIRONMENT` e `BHS_DEV_MOCK_AUTH`.
