## Fase 8: Escala e Operacao

Status: concluida.

**Objetivo**

Criar processos repetiveis para onboarding de clientes, evolucao de schemas/templates, monitoramento e operacao diaria da plataforma multi-cliente.

O resultado esperado e a equipe conseguir criar, validar, publicar e manter clientes diferentes com baixo risco e sem improviso manual.

**Contexto Atual**

- Clientes usam schemas separados no mesmo banco.
- Configuracao visual e versionada em `app_core`.
- Frontend renderiza telas publicadas.
- Backend consulta dados via allowlist e tenant schema.
- Fase 6 deve entregar ferramenta interna.
- Fase 7 deve endurecer auth, auditoria e isolamento.

**Decisoes Fixadas**

- Schema por cliente continua sendo o modelo.
- `app_core` continua sendo o centro de configuracao.
- Onboarding nao deve depender de editar codigo React.
- Atualizacao de template deve validar todos os clientes impactados.
- Operacao deve conseguir diagnosticar erro por cliente/tela/widget.

**Escopo**

**1. Processo de onboarding de cliente**

- [x] Definir checklist oficial de novo cliente.
- [x] Cadastrar cliente em `app_core.clients`.
- [x] Criar schema tenant seguindo padrao `tenant_<slug_normalizado>`.
- [x] Aplicar template base de tabelas/views.
- [x] Carregar dados iniciais ou fixtures controladas.
- [x] Rodar `app_core.validate_tenant_schema`.
- [x] Criar fontes de dados em `app_core.data_sources`.
- [x] Criar configuracao inicial de modulos/telas/widgets.
- [x] Validar versao inicial.
- [x] Publicar versao inicial.
- [x] Fazer smoke test como usuario do cliente.

**2. Automacao operacional minima**

- [x] Criar script ou comando para scaffolding de tenant.
- [x] Criar script ou comando para validar tenant.
- [x] Criar script ou comando para gerar relatorio de configuracao publicada.
- [x] Criar script ou comando para smoke test de endpoints principais.
- [x] Garantir que comandos nao gravam secrets em arquivos.

**3. Atualizacao de template/schema**

- [x] Definir padrao de migration comum.
- [x] Definir como aplicar migration em todos os tenants.
- [x] Criar validacao pre e pos migration.
- [x] Criar relatorio de impacto por cliente.
- [x] Bloquear alteracao que quebra configuracao publicada.
- [x] Documentar rollback de migration quando possivel.

**4. Monitoramento funcional**

- [x] Monitorar health da API.
- [x] Monitorar erros por rota.
- [x] Monitorar latencia de `/api/v1/query`.
- [x] Monitorar falhas por client_slug/client_id.
- [x] Monitorar widget quebrado por screenId/widgetId.
- [x] Monitorar falhas de publicacao/validacao.
- [x] Definir threshold inicial para alertas.

**5. Diagnostico operacional**

- [x] Criar playbook para erro em tela.
- [x] Criar playbook para erro em widget.
- [x] Criar playbook para schema tenant invalido.
- [x] Criar playbook para publicacao errada.
- [x] Criar playbook para rollback de configuracao.
- [x] Criar playbook para cliente sem dados.

**6. Documentacao para equipe**

- [x] Manual de criar cliente.
- [x] Manual de criar tela por configuracao.
- [x] Manual de criar grafico/KPI/tabela.
- [x] Manual de validar e publicar.
- [x] Manual de rollback.
- [x] Manual de limites: o que nao pode ser feito sem desenvolvimento.

**7. Qualidade e regressao**

- [x] Criar suite de smoke tests multi-cliente.
- [x] Validar BHS e ACME como fixtures permanentes.
- [x] Validar que mock nao mascara ambiente real.
- [x] Criar checklist de QA visual minimo.
- [x] Criar criterio para aceitar novo widget/tipo visual.

**Arquivos Provaveis**

- `backend/app/repositories/config_repository.py`
- `backend/app/repositories/query_repository.py`
- `backend/app/services/config_validation_service.py`
- `backend/tests/*`
- `supabase/migrations/*`
- `scripts/*` ou pasta equivalente, se criada nesta fase.
- `plans/MANUAL_OPERACIONAL_MULTI_CLIENTE.md`
- `plans/MANUAL_CRIACAO_TELAS_GRAFICOS.md`
- `plans/logs/FASE_8_EXECUCAO.md`
- `README.md`
- `backend/README.md`

**Fora de Escopo**

- Reescrever arquitetura multi-tenant.
- Criar analytics avancado de uso.
- Criar billing/assinaturas.
- Criar marketplace de templates.
- Criar editor visual drag-and-drop completo.
- Suporte a bancos separados por cliente.

**Riscos Graves**

- Onboarding manual gerar schemas diferentes.
- Migration comum quebrar cliente antigo.
- Cliente novo publicar tela sem dados/sem campos.
- Falha em um tenant interromper validacao dos demais.
- Documentacao ficar generica e nao operacional.
- Diagnostico depender de acesso direto manual ao banco.

**Mitigacoes Obrigatorias**

- Scripts/checklists repetiveis.
- Validacao automatica antes e depois de migration.
- Fixtures BHS/ACME como teste de regressao.
- Relatorio de impacto antes de alteracao estrutural.
- Smoke tests por cliente/tela/widget.
- Playbooks curtos e acionaveis.

**Sequencia de Execucao Recomendada**

1. Rodar validator do plano antes de executar.
2. Mapear processo manual atual de onboarding.
3. Criar checklist oficial.
4. Criar scripts operacionais minimos.
5. Criar validacao de tenant e smoke tests.
6. Criar processo de migration/template.
7. Criar documentacao operacional.
8. Rodar fluxo completo com cliente demo novo ou sandbox.
9. Rodar regressao BHS/ACME.
10. Atualizar log, plano global e mapas.

**Validacoes de Aceite**

- [x] `npm.cmd run build` passa quando frontend for tocado.
- [x] `python -m pytest` no backend passa.
- [x] Novo tenant demo pode ser criado por processo documentado.
- [x] `validate_tenant_schema` passa no tenant novo.
- [x] Versao inicial pode ser validada e publicada.
- [x] Smoke test consulta pelo menos uma tela, um chart, um KPI e uma tabela.
- [x] BHS e ACME continuam funcionando apos processo/template.
- [x] Manual operacional criado.
- [x] Manual de criacao de telas/graficos criado.
- [x] `python summarize.py` executado ao final.

**Criterios de Conclusao**

- Novo cliente pode ser criado por processo repetivel.
- Atualizacao de schema/template nao quebra clientes existentes sem aviso.
- Time consegue diagnosticar erro por cliente/tela/widget.
- Operacao nao depende de editar codigo React para criar tela padrao.
- Plataforma fica pronta para evolucao controlada apos as fases estruturais.
