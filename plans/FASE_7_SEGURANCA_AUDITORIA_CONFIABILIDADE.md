# Fase 7: Seguranca, Auditoria e Confiabilidade

Status: planejada.

## Objetivo

Endurecer autenticacao, autorizacao, isolamento multi-tenant, auditoria e confiabilidade para transformar o backend atual em base segura para uso real.

O resultado esperado e provar tecnicamente que cliente A nao acessa cliente B, que a equipe interna tem permissoes controladas e que acoes criticas ficam auditaveis.

## Contexto Atual

- O projeto usa headers temporarios (`x-client-slug`, `x-user-email`) para simular usuario/cliente.
- Schemas tenant existem e continuam privados.
- Backend resolve tenant e permissao, mas auth final ainda nao foi implementada.
- Area interna da Fase 6 depende de endurecimento antes de producao.
- Supabase foi escolhido como banco e pode ser usado tambem para Auth, se mantiver compatibilidade com backend FastAPI.

## Decisoes Fixadas

- Frontend nao decide tenant.
- Frontend nao decide permissao final.
- Backend valida token, resolve usuario, resolve cliente e aplica permissao.
- Schemas tenant nao devem ser expostos diretamente para `anon`/`authenticated`.
- Service role ou conexao privilegiada fica somente no backend.
- Toda acao critica deve gerar auditoria.

## Escopo

### 1. Autenticacao real

- [ ] Escolher e documentar estrategia final: Supabase Auth JWT ou JWT compativel validado pelo backend.
- [ ] Remover dependencia operacional de `x-user-email` como identidade confiavel.
- [ ] Validar assinatura, issuer, audience, expiracao e subject do token.
- [ ] Mapear token para usuario em `app_core.users` ou tabela equivalente.
- [ ] Diferenciar usuario cliente e usuario interno.
- [ ] Manter modo dev/mock apenas atras de flag explicita.

### 2. Autorizacao e tenant

- [ ] Resolver cliente permitido a partir do usuario autenticado.
- [ ] Impedir `x-client-slug` de trocar tenant sem permissao.
- [ ] Revisar `PermissionService` para regras reais por cliente/tela.
- [ ] Garantir que `/modules`, `/screens/{screen_id}` e `/query` usam usuario autenticado.
- [ ] Garantir que endpoints internos exigem usuario interno.
- [ ] Criar testes de tentativa de acesso cruzado.

### 3. Supabase/Postgres hardening

- [ ] Revisar grants de `app_core`.
- [ ] Confirmar que schemas `tenant_*` nao estao expostos por Data API.
- [ ] Criar roles/conexao separadas se necessario: app backend, migracao, leitura operacional.
- [ ] Avaliar RLS onde fizer sentido em tabelas `app_core`.
- [ ] Garantir que `search_path` nao permite acesso indevido.
- [ ] Validar que consultas dinamicas continuam usando allowlist e quote seguro.

### 4. Auditoria

- [ ] Criar tabela de auditoria em `app_core`.
- [ ] Registrar login/autenticacao relevante quando aplicavel.
- [ ] Registrar criacao de draft.
- [ ] Registrar validacao de versao.
- [ ] Registrar publicacao, rollback e archive.
- [ ] Registrar execucao de queries criticas ou falhas de query.
- [ ] Registrar erros de permissao e tentativa cross-tenant.
- [ ] Incluir actor, client_id, action, resource_type, resource_id, status, metadata, created_at.

### 5. Observabilidade minima

- [ ] Padronizar logs estruturados no backend.
- [ ] Adicionar request id/correlation id.
- [ ] Logar latencia de `/query`.
- [ ] Logar cliente, screenId e widgetId sem vazar dados sensiveis.
- [ ] Criar healthcheck mais util para dependencia de banco, se adequado.
- [ ] Definir limites basicos de payload e timeout.

### 6. Confiabilidade da API

- [ ] Padronizar erros para frontend.
- [ ] Garantir que erro de widget nao derruba tela inteira.
- [ ] Garantir resposta 401/403/404 consistente.
- [ ] Criar testes para token ausente, token invalido e permissao negada.
- [ ] Criar testes para schema tenant invalido.
- [ ] Criar testes para filtro nao permitido.

### 7. Configuracao segura de ambiente

- [ ] Documentar variaveis de ambiente obrigatorias.
- [ ] Separar ambiente dev/homolog/prod.
- [ ] Impedir uso acidental de modo mock em producao.
- [ ] Garantir que secrets nao sejam gravados em arquivos versionados.
- [ ] Criar exemplo `.env.example` sem segredos reais, se ainda nao existir.

## Arquivos Provaveis

- `backend/app/core/config.py`
- `backend/app/dependencies/identity.py`
- `backend/app/core/security.py`
- `backend/app/services/permission_service.py`
- `backend/app/repositories/config_repository.py`
- `backend/app/repositories/query_repository.py`
- `backend/app/services/query_service.py`
- `backend/app/api/v1/endpoints/*.py`
- `backend/tests/test_api_contracts.py`
- `backend/tests/test_query_api.py`
- `backend/tests/test_query_service.py`
- `backend/tests/test_versioning_service.py`
- `supabase/migrations/*phase_7*.sql`
- `src/services/apiClient.ts`
- `src/services/configApi.ts`
- `plans/logs/FASE_7_EXECUCAO.md`

## Fora de Escopo

- Criar novo produto de IAM complexo.
- Reescrever frontend inteiro.
- Criar painel completo de logs.
- Otimizacao pesada de performance.
- Onboarding automatizado de cliente, que fica para Fase 8.

## Riscos Graves

- Token valido permitir trocar cliente por header.
- RLS/grants exporem schemas tenant para cliente.
- Service role vazar para frontend.
- Logs salvarem dados sensiveis.
- Modo mock ficar ativo em producao.
- Auditoria registrar evento incompleto e perder rastreabilidade.
- Testes passarem em mock e falharem contra banco real.

## Mitigacoes Obrigatorias

- Validacao de auth sempre no backend.
- Tenant derivado do usuario, nao da vontade do frontend.
- Testes cross-tenant obrigatorios.
- Secrets apenas em env.
- Auditoria em acoes criticas.
- Erros padronizados.
- Flags dev com nomes explicitos e bloqueio em producao.

## Sequencia de Execucao Recomendada

1. Rodar validator do plano antes de executar.
2. Definir estrategia JWT/Supabase Auth.
3. Implementar validacao de token no backend.
4. Mapear usuario autenticado para cliente/permissoes.
5. Substituir headers temporarios por auth real.
6. Endurecer endpoints cliente e internos.
7. Criar migracao de auditoria.
8. Adicionar logs estruturados/request id.
9. Revisar grants/RLS/search_path.
10. Criar testes de seguranca e isolamento.
11. Validar contra Supabase real.
12. Atualizar log, plano global e mapas.

## Validacoes de Aceite

- [ ] `npm.cmd run build` passa.
- [ ] `python -m pytest` no backend passa.
- [ ] Token ausente retorna 401.
- [ ] Token invalido retorna 401.
- [ ] Usuario cliente nao acessa endpoint interno.
- [ ] Cliente A nao acessa modulos/telas/query do cliente B.
- [ ] Header de cliente nao burla tenant real.
- [ ] Publicacao gera auditoria.
- [ ] Rollback gera auditoria.
- [ ] Query proibida gera erro controlado e auditoria/LOG.
- [ ] Schemas tenant nao ficam expostos ao frontend.
- [ ] `python summarize.py` executado ao final.

## Criterios de Conclusao

- Teste prova isolamento entre clientes.
- Publicacoes ficam auditaveis.
- Erros de configuracao e permissao sao bloqueados antes de producao.
- Auth temporaria nao e mais base de confianca.
- Backend fica pronto para operacao controlada.
