# Fase 4 - Execucao parcial

Data: 2026-07-27

- WhatsApp: provider passou a ser async, com timeout configuravel e retry somente na abertura de conexao. O endpoint recebe `Idempotency-Key`; a migration aditiva `20260727120000_whatsapp_idempotency.sql` persiste a chave e impede duplicidade por tenant.
- Operacao: readiness existente agora agrega contadores HTTP por processo, tempo acumulado e uptime. O roteiro `docs/OPERACAO_PRE_DEPLOY.md` define limites iniciais de workers/proxy, aquecimento, variaveis e rollback.
- Validacao: 133 testes backend, lint focado e build frontend aprovados. A idempotencia e a telemetria possuem cobertura dedicada.
- Publicacao Gelobel: a versao 19 continha `Mensagens`, mas a ocultava por `visibility`; `Configurações` estava ausente. Com autorizacao do usuario, a migration `20260727130000_restore_gelobel_navigation.sql` arquivou a versao 19 e publicou a 31, restaurando somente esses itens e preservando IDs, permissoes, menu e conteudo existente.
- Smoke real: um MASTER ativo foi validado; `Mensagens`, `Disparos no WhatsApp`, `Simuladores`, `Simulador de Combos` e `Configurações` estao publicados. A carga somente leitura executou 20 consultas ao catalogo com concorrencia 5 e p95 de 742,8 ms, sem escrita ou esgotamento do pool.
- Validacao final: `python -m pytest tests -q` aprovou 133 testes, lint focado e build frontend aprovados.
