# Plano de Gestao de Usuarios, Permissoes e Senhas

Status geral: **em andamento (Fases 1, 2, 3, 4, 5 e 6 concluidas)**.

## 1. Objetivo

Implantar gestao de usuarios em dois niveis:

1. **Equipe BHS** usa uma unica conta administrativa e cria/administra somente os MASTERs dos clientes.
2. **MASTER do cliente** administra usuarios comuns apenas do proprio tenant.

Cada usuario comum recebe acesso somente as telas autorizadas. Toda conta criada ou redefinida por um administrador usa senha temporaria e exige troca no proximo login.

## 2. Base atual identificada

- Backend FastAPI com JWT proprio e senhas PBKDF2.
- Usuarios globais em `app_core.app_users`.
- Vinculo tenant/usuario em `app_core.client_users`.
- Permissoes por tela em `app_core.client_screen_permissions` com `none`, `read` e `write`.
- Equipe identificada por `is_staff`; o modelo atual de `staff_role` sera simplificado para aceitar apenas o MASTER unico da equipe.
- Administrador do cliente atualmente representado por `roles = ['admin']`.
- Endpoints atuais `/api/v1/internal/users` aceitam apenas MASTER da equipe.
- Frontend possui painel inicial de usuarios, mas somente para staff.
- Schemas `app_core` e `tenant_*` permanecem privados; acesso ocorre pelo backend.

## 3. Papeis e limites

Regra hierarquica unica: **EQUIPE > MASTER > USUARIO COMUM**.

| Papel | Escopo | Pode criar | Pode redefinir senha | Pode definir telas |
|---|---|---|---|---|
| EQUIPE | Plataforma inteira, usando uma conta MASTER unica | Apenas MASTERs de tenant | Apenas MASTERs de tenant | Nao |
| MASTER do tenant | Somente sua organizacao | Usuarios comuns do proprio tenant | Usuarios comuns do proprio tenant | Usuarios comuns do proprio tenant |
| Usuario comum | Somente sua conta e telas liberadas | Ninguem | Apenas altera a propria senha | Nao |

Decisoes de seguranca:

- MASTER do tenant nao cria outro MASTER no MVP. Novo MASTER e criado pela equipe BHS.
- EQUIPE nao cria, edita permissoes nem redefine senha de usuario comum.
- Nao existe operador da equipe nem criacao de novas contas internas.
- Usuario pertence a um unico tenant no MVP.
- MASTER do tenant nao informa nem altera `client_id`/`client_slug`; o backend deriva do token.
- O frontend nunca decide o tenant efetivo.
- Senha definitiva nunca fica visivel para administradores.

## 4. Ciclo de vida da senha

### 4.1 Criacao

1. Administrador escolhe **gerar senha forte** ou **definir senha temporaria**.
2. Backend valida a politica e armazena somente o hash.
3. Conta nasce com `must_change_password = true`.
4. Senha gerada e retornada uma unica vez; nao sera recuperavel depois.
5. Primeiro login emite credencial restrita apenas para troca de senha.
6. Usuario define senha definitiva; backend libera uma nova sessao normal.

### 4.2 Redefinicao pelo administrador

1. Administrador gera ou define nova senha temporaria.
2. Backend incrementa `credentials_version`, invalidando tokens anteriores.
3. Conta volta para `must_change_password = true`.
4. Usuario troca a senha no login seguinte.

### 4.3 Alteracao pelo proprio usuario

- Usuario autenticado informa senha atual e nova senha.
- Na troca obrigatoria, a senha temporaria ja foi validada no login restrito.
- Nova senha deve ser diferente da temporaria/atual.
- Troca incrementa `credentials_version` e gera nova sessao.

### 4.4 Politica inicial

- Minimo de 10 caracteres.
- Exigir letras maiuscula e minuscula, numero e caractere especial.
- Senha gerada por gerador criptograficamente seguro.
- Validade da senha temporaria: 24 horas, configuravel.
- Nunca registrar senha, hash ou token em auditoria/logs.
- Recuperacao automatica por e-mail fica fora do MVP; redefinicao administrativa cobre o fluxo inicial.

## 5. Modelo de dados proposto

Adicionar em `app_core.app_users`:

- `must_change_password boolean not null default true`
- `temporary_password_expires_at timestamptz null`
- `password_changed_at timestamptz null`
- `password_reset_at timestamptz null`
- `password_reset_by uuid null references app_core.app_users(id)`
- `credentials_version integer not null default 1`

Regras:

- Contas existentes validadas devem receber `must_change_password = false` na migracao.
- Novas contas recebem `must_change_password = true`.
- JWT inclui `credentials_version`; backend compara claim com banco em toda autenticacao.
- Usuario inativo ou com versao divergente recebe `401`.
- `updated_at` deve ser atualizado nas alteracoes de credenciais e status.

## 6. Contratos de API propostos

### 6.1 Equipe BHS

- `GET /api/v1/internal/masters`: listar MASTERs dos tenants.
- `POST /api/v1/internal/masters`: criar MASTER vinculado a um tenant.
- `PATCH /api/v1/internal/masters/{user_id}`: editar dados e status do MASTER.
- `POST /api/v1/internal/masters/{user_id}/reset-password`: gerar/definir senha temporaria do MASTER.

Esses endpoints rejeitam criacao ou alteracao de usuario comum.

### 6.2 MASTER do tenant

- `GET /api/v1/tenant/users`: listar somente usuarios do tenant autenticado.
- `POST /api/v1/tenant/users`: criar usuario comum no tenant autenticado.
- `PATCH /api/v1/tenant/users/{user_id}`: editar usuario comum do mesmo tenant.
- `POST /api/v1/tenant/users/{user_id}/reset-password`: redefinir senha de usuario comum do mesmo tenant.
- `PUT /api/v1/tenant/users/{user_id}/permissions`: substituir permissoes por tela de forma atomica.

### 6.3 Proprio usuario

- `POST /api/v1/auth/login`: retornar acesso normal ou token restrito com `password_change_required=true`.
- `POST /api/v1/auth/change-password`: concluir troca obrigatoria ou alteracao voluntaria.
- `GET /api/v1/me`: retornar papel, tenant, telas e estado da senha.

Regras de contrato:

- Endpoints de tenant ignoram tenant enviado pelo cliente.
- Redefinicao recebe `mode = generated | defined` e senha somente quando `defined`.
- Resposta com senha gerada usa campo de exibicao unica e cabecalhos sem cache.
- Erros nao revelam se um e-mail existe fora do escopo do administrador.

## 7. Permissoes por tela

- MASTER do tenant enxerga somente telas publicadas para seu tenant.
- Para cada usuario comum, MASTER define `none`, `read` ou `write`.
- Ausencia de registro equivale a `none`.
- `read` libera menu, rota e consultas da tela.
- `write` inclui leitura e operacoes mutaveis explicitamente suportadas.
- Backend valida permissao em cada endpoint; ocultacao no frontend e apenas UX.
- Modulo `Configuracoes > Usuarios` e estrutural para MASTER do tenant e nao depende da publicacao de dashboards.
- Usuario comum nunca acessa gestao de usuarios, mesmo que tente abrir a rota diretamente.

## 8. Fases de execucao

### Fase 1 - Contratos e matriz de autorizacao

Status: **concluida em 2026-07-13**.

Escopo:

- [x] Formalizar os tres niveis: EQUIPE, tenant MASTER e usuario comum.
- [x] Separar dependencias `get_team_master` e `get_tenant_master`.
- [x] Remover operador da equipe dos contratos, regras e interface.
- [x] Definir contratos Pydantic e TypeScript para usuarios, senha e permissoes.
- [x] Definir politica de senha em configuracao do backend.
- [x] Mapear endpoints existentes que exigem `read` ou `write`.

Aceite:

- [x] Matriz de autorizacao cobre todas as operacoes.
- [x] Nenhum contrato aceita troca de tenant por usuario de cliente.
- [x] Decisoes sao refletidas em testes de contrato antes da implementacao funcional.

### Fase 2 - Migracao e persistencia

Status: **concluida em 2026-07-13**.

Escopo:

- [x] Criar migration via Supabase CLI para campos de ciclo de senha.
- [x] Preservar contas existentes sem forcar troca indevida.
- [x] Implementar geracao segura, hash, expiracao e `credentials_version`.
- [x] Implementar consultas sempre limitadas pelo tenant do ator.
- [x] Manter `app_core` e `tenant_*` fora da Data API.

Aceite:

- [x] Migration aplica e reverte de forma controlada em ambiente de teste.
- [x] Nenhuma senha temporaria ou definitiva e persistida em texto puro.
- [x] MASTER do tenant nao consegue consultar ou alterar outro tenant.
- [x] Advisors/grants nao apontam nova exposicao critica.

### Fase 3 - Backend de usuarios e permissoes

Status: **concluida em 2026-07-13**.

Escopo:

- [x] Ajustar repository e service para escopo global e tenant.
- [x] Implementar para EQUIPE somente CRUD de MASTERs de tenant.
- [x] Implementar CRUD restrito para MASTER do tenant.
- [x] Implementar atribuicao atomica de permissoes por tela.
- [x] Bloquear autodesativacao e remocao do ultimo MASTER do tenant.
- [x] Padronizar conflitos de e-mail e recursos fora do escopo.

Aceite:

- [x] Equipe cria MASTER vinculado a cliente ativo.
- [x] Equipe nao consegue criar, editar permissoes ou redefinir senha de usuario comum.
- [x] MASTER cria, edita, ativa e desativa usuario comum do proprio tenant.
- [x] MASTER nao promove usuario a MASTER nem altera tenant.
- [x] Permissoes invalidas ou telas de outro tenant sao rejeitadas.

### Fase 4 - Senha temporaria e sessao

Status: **concluida em 2026-07-13**.

Escopo:

- [x] Implementar geracao e definicao de senha temporaria.
- [x] Implementar login restrito para troca obrigatoria.
- [x] Implementar troca obrigatoria e alteracao voluntaria.
- [x] Validar expiracao da senha temporaria.
- [x] Validar `credentials_version` em cada request autenticada.
- [x] Revogar sessoes ao redefinir senha, desativar usuario ou mudar escopo/papel.

Aceite:

- [x] Usuario com senha temporaria nao acessa nenhuma rota funcional.
- [x] Apos troca, senha temporaria deixa de funcionar.
- [x] Tokens anteriores falham imediatamente apos redefinicao.
- [x] MASTER pode redefinir novamente sem conhecer a senha definitiva.

### Fase 5 - Frontend da EQUIPE

Status: **concluida em 2026-07-13**.

Escopo:

- [x] Evoluir `Configuracoes > Usuarios` para listar somente MASTERs, com filtros por tenant e status.
- [x] Criar somente o fluxo de gestao de MASTER do cliente.
- [x] Adicionar gerador de senha, campo de senha temporaria e medidor de politica.
- [x] Exibir senha gerada uma unica vez com acao explicita de copia.
- [x] Adicionar editar, ativar/desativar e redefinir senha do MASTER.
- [x] Exigir confirmacao em acoes sensiveis.

Aceite:

- [x] Equipe administra MASTERs sem acessar banco manualmente.
- [x] Interface da EQUIPE nao oferece criacao ou gestao de usuario comum.
- [x] Interface nunca reexibe senha apos fechar a confirmacao.
- [x] Filtros e estados refletem dados reais da API.

### Fase 6 - Frontend do MASTER do tenant

Status: **concluida em 2026-07-13**.

Escopo:

- [x] Liberar submodulo estrutural `Configuracoes > Usuarios` para tenant MASTER.
- [x] Reutilizar painel com modo tenant, sem seletor de cliente ou perfis internos.
- [x] Listar somente usuarios da propria organizacao.
- [x] Permitir criacao, edicao, status, redefinicao e matriz de telas.
- [x] Implementar tela bloqueante de troca obrigatoria de senha.

Aceite:

- [x] Tenant MASTER administra usuarios sem ver controles da EQUIPE.
- [x] Usuario comum nao visualiza o submodulo nem acessa sua rota.
- [x] Sidebar reflete imediatamente as permissoes efetivas apos novo login/token.

### Fase 7 - Auditoria, testes e operacao

Status: **em andamento (aguardando inspecao interativa do frontend em modo API)**.

Escopo:

- [x] Auditar criacao, alteracao, status, permissoes, redefinicao e troca de senha.
- [x] Registrar tentativas negadas e cross-tenant sem dados sensiveis.
- [x] Testar unitariamente politica e gerador de senha.
- [x] Testar API para os tres niveis, expiracao, revogacao e concorrencia.
- [ ] Testar frontend em modo API real.
- [x] Documentar onboarding, recuperacao, bloqueio e rollback.

Aceite:

- [x] Suite backend e build frontend passam.
- [x] Testes negativos cobrem IDOR/cross-tenant e elevacao de privilegio.
- [x] Auditoria identifica ator, tenant, alvo, acao, resultado e horario.
- [x] Operacao consegue recuperar uma conta sem consultar ou alterar hashes manualmente.

## 9. Casos de teste obrigatorios

- EQUIPE cria MASTER Gelobel com senha gerada.
- EQUIPE tenta criar ou redefinir usuario comum e e bloqueada.
- MASTER Gelobel entra, e obrigado a trocar a senha e recebe acesso normal somente depois.
- MASTER Gelobel cria usuario comum e define telas `read`/`write`.
- Usuario comum ve somente menus e endpoints autorizados.
- MASTER Gelobel tenta alterar usuario Demo e recebe `403`/`404` seguro.
- MASTER Gelobel tenta promover usuario para MASTER e e bloqueado.
- Redefinicao invalida token antigo imediatamente.
- Senha temporaria expirada e rejeitada.
- Usuario inativo nao autentica e sessao anterior deixa de funcionar.
- Alteracao de permissoes exige renovacao/invalida sessao anterior.
- Logs nao contem senha, hash ou token.

## 10. Ordem de entrega e dependencias

```text
Contratos e papeis
  -> migration e persistencia
  -> backend tenant-safe
  -> senha e revogacao
  -> painel BHS
  -> painel MASTER do tenant
  -> auditoria e homologacao
```

Nao iniciar frontend antes de contratos e regras cross-tenant estarem testados no backend.

## 11. Fora do escopo inicial

- Operador da equipe ou contas internas adicionais.
- Usuario vinculado a varios tenants.
- MASTER do tenant criando outro MASTER.
- Recuperacao automatica por e-mail/SMS.
- MFA/2FA.
- Permissoes por linha ou campo de dados alem das regras existentes do tenant.

## 12. Validacoes finais

- `python -m pytest backend/tests`
- `npm run build`
- Testes manuais com equipe BHS, BHS Demo, Gelobel e usuario comum.
- Verificacao de grants dos schemas `app_core` e `tenant_*`.
- Verificacao de migrations e advisors antes de considerar a fase concluida.

## 13. Regra de encerramento

Uma fase so pode ser marcada como concluida quando todos os itens de escopo e aceite estiverem verificados. Entrega parcial permanece **em andamento**, com bloqueios listados explicitamente.
