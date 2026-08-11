# Fase 2 - Backend JWT e Tenant Resolver

Data: 2026-07-07

Status: concluida.

Escopo:
- Adicionada configuracao JWT de expiracao, issuer e audience.
- Login passa a emitir claims `sub`, `email`, `is_staff`, `roles` e `client_slug`.
- Decode valida issuer/audience/exp.
- Dependencia de identidade bloqueia token cliente sem tenant.
- Dependencia interna exige `is_staff=true`.
- Teste cobre token sem tenant.

Arquivos alterados:
- `backend/app/core/config.py`
- `backend/app/core/security.py`
- `backend/app/api/v1/endpoints/auth.py`
- `backend/app/dependencies/identity.py`
- `backend/tests/test_security_audit.py`
- `plans/logs_plano_controle_governabilidade/FASE_2_EXECUCAO.md`

Validacao:
- `powershell -ExecutionPolicy Bypass -File ...validate-phase.ps1 -PlanFile plans/PLANO_CONTROLE_USUARIOS_GOVERNABILIDADE.md -PhaseLabel "Fase 2"`: Checked 9, Unchecked 0.
- `python -m pytest backend/tests/test_auth_api.py backend/tests/test_security_audit.py`: 8 passed.
- `python -m pytest backend/tests`: 32 passed.
- `python summarize.py`: mapas regenerados com sucesso.

Pendencias:
- Nenhuma nesta fase.
