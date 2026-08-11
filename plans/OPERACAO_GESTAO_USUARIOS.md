# Operacao - Gestao de Usuarios

## Onboarding

1. A EQUIPE cria apenas o MASTER do tenant em `Configuracoes > Usuarios`.
2. Informe ou gere uma senha temporaria e entregue-a por canal seguro.
3. O MASTER entra, troca a senha obrigatoriamente e cria usuarios comuns do proprio tenant.
4. O MASTER define as telas de cada usuario como `none`, `read` ou `write`.

## Recuperacao e bloqueio

- MASTER esquecido/bloqueado: a EQUIPE redefine a senha do MASTER.
- Usuario comum esquecido/bloqueado: o MASTER do tenant redefine a senha.
- Senha temporaria expirada: o administrador responsavel redefine novamente.
- Usuario inativo: reative-o pelo painel; a sessao anterior permanece revogada.
- Nunca recuperar acesso por hash, banco ou envio da senha definitiva.

## Revogacao e auditoria

- Redefinir senha, inativar usuario ou trocar permissoes invalida tokens anteriores.
- Eventos ficam em `app_core.audit_logs`: ator, tenant, alvo, acao, resultado e horario.
- Senhas, hashes e tokens nao podem ser registrados em logs ou auditoria.

## Rollback

1. Pause alteracoes de usuarios no painel.
2. Reaplique o rollback da migration de ciclo de senha apenas em ambiente validado.
3. Valide `app_core.app_users`, permissoes e grants antes de reabrir o painel.
4. Se a necessidade for recuperar uma pessoa, prefira redefinir a senha pelo painel; rollback nao e fluxo de recuperacao de conta.
