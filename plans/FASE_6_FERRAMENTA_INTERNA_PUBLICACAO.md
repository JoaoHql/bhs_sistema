# Fase 6: Ferramenta Interna de Publicacao

Status: planejada.

## Objetivo

Criar uma area interna para a equipe configurar, validar, pre-visualizar e publicar versoes de telas por cliente sem editar codigo React e sem mexer diretamente no banco.

O resultado esperado nao e um editor visual completo. O resultado esperado e uma ferramenta operacional confiavel para publicar configuracoes ja suportadas pelo motor atual.

## Contexto Atual

- Fases 1 a 5 ja criaram backend FastAPI, modelagem multi-tenant, versionamento de configuracao, endpoint de consulta e frontend renderizando configuracao publicada.
- O backend ja tem endpoints internos de versao: draft, validate, publish, rollback e archive.
- O frontend ainda nao tem fluxo interno completo para equipe criar/validar/publicar versoes.
- Auth real ainda nao esta fechada; nesta fase pode continuar com guard interno temporario, desde que isolado e marcado para endurecimento na Fase 7.

## Decisoes Fixadas

- Cliente final nao edita telas nesta fase.
- Equipe interna configura telas por cliente.
- Criacao de tela nova deve acontecer por configuracao publicada, nao por novo arquivo React.
- IA fica fora do fluxo principal.
- A ferramenta deve operar sobre `app_core` e os contratos existentes, nao sobre schema tenant diretamente.
- Nenhuma publicacao pode ocorrer sem validacao backend.

## Escopo

### 1. Rotas e area interna

- [ ] Criar entrada de navegacao interna apenas para usuarios internos.
- [ ] Criar tela base de administracao de clientes.
- [ ] Listar clientes ativos com slug, nome, status e schema tenant associado.
- [ ] Impedir acesso visual a usuarios nao internos, mesmo antes da auth real.

### 2. Gestao de versoes

- [ ] Listar versoes por cliente usando endpoint interno existente.
- [ ] Mostrar status da versao: draft, validated, published, archived, failed.
- [ ] Mostrar versao publicada atual.
- [ ] Permitir criar draft a partir da versao publicada.
- [ ] Permitir arquivar draft/versao nao publicada.
- [ ] Permitir rollback para versao anterior publicada.

### 3. Editor operacional de configuracao

- [ ] Permitir editar metadados de modulo: id, label, icon, ordem e telas.
- [ ] Permitir editar tela: id, title, subtitle, filtros, widgets e layout.
- [ ] Permitir editar widget com tipos suportados: chart, kpi e table.
- [ ] Permitir configurar `dataSourceId`, metricas, dimensoes, filtros permitidos e formato.
- [ ] Nao permitir SQL livre, schema livre, tabela livre ou campo fora do catalogo.
- [ ] Preservar contratos `AppModule`, `AppScreen`, `AppWidget`, `ChartConfig` e equivalentes Pydantic.

### 4. Catalogo de campos e fontes

- [ ] Consumir catalogo validado vindo do backend.
- [ ] Exibir apenas fontes de dados permitidas para o cliente.
- [ ] Exibir apenas campos catalogados por fonte.
- [ ] Diferenciar campo numerico, texto, data e booleano.
- [ ] Bloquear combinacoes invalidas antes de enviar para validacao.

### 5. Validacao backend obrigatoria

- [ ] Acionar validacao antes de publicar.
- [ ] Mostrar erros por modulo, tela, widget, filtro e campo.
- [ ] Bloquear botao publicar quando a versao nao estiver validada.
- [ ] Revalidar automaticamente apos alteracao relevante.
- [ ] Registrar no plano/log qualquer validacao ainda fraca.

### 6. Preview como cliente

- [ ] Criar preview da versao draft sem publicar para o cliente.
- [ ] Preview deve usar os mesmos componentes visuais do frontend final.
- [ ] Preview deve usar `/api/v1/query` com contexto interno controlado.
- [ ] Mostrar claramente ambiente: draft/preview, cliente e versao.
- [ ] Nao misturar preview draft com versao publicada em uso pelo cliente.

### 7. Publicacao segura

- [ ] Publicar apenas versao validada.
- [ ] Garantir que nova publicacao arquive a anterior.
- [ ] Confirmar publicacao com resumo de impacto.
- [ ] Apos publicar, cliente deve receber nova configuracao por `/modules` e `/screens/{screen_id}`.
- [ ] Publicacao deve ser atomica do ponto de vista do cliente.

### 8. UX operacional

- [ ] Interface densa, administrativa e objetiva.
- [ ] Evitar landing page, hero ou telas decorativas.
- [ ] Usar tabela/lista para clientes e versoes.
- [ ] Usar paineis de formulario para configuracao.
- [ ] Usar estados claros: carregando, erro, validando, valido, publicado.
- [ ] Preservar padrao visual existente.

## Arquivos Provaveis

- `src/App.tsx`
- `src/layouts/Sidebar.tsx`
- `src/services/configApi.ts`
- `src/services/apiClient.ts`
- `src/types/index.ts`
- `src/features/configuracoes/views/ConfiguracoesView.tsx`
- `src/features/cadastros/views/DynamicCanvasView.tsx`
- `backend/app/api/v1/endpoints/config_versions.py`
- `backend/app/services/config_validation_service.py`
- `backend/app/repositories/config_repository.py`
- `backend/tests/test_versioning_service.py`
- `plans/logs/FASE_6_EXECUCAO.md`

## Fora de Escopo

- Auth Supabase/JWT final.
- RLS/grants finais de producao.
- Editor drag-and-drop completo.
- Criacao automatica de schema tenant.
- Importacao massiva de dados.
- Otimizacao de performance em escala.
- IA criando/modificando configuracao automaticamente.

## Riscos Graves

- Publicar configuracao quebrada e derrubar tela do cliente.
- Preview usar caminho diferente do cliente real.
- Equipe editar JSON livre e burlar validacao.
- Cliente ver draft interno por erro de isolamento.
- Frontend virar dono da regra de permissao/publicacao.
- Rollback nao restaurar estado anterior completo.
- Configuracao apontar para campo inexistente no schema tenant.

## Mitigacoes Obrigatorias

- Backend continua autoridade de validacao/publicacao.
- Toda publicacao passa por `validate`.
- Preview usa o mesmo renderizador do cliente.
- Formulario usa catalogo, nao entrada livre para campos sensiveis.
- Logs de execucao registram cliente, versao e acao.
- Testes cobrem publicar, rollback, draft invalido e isolamento cliente.

## Sequencia de Execucao Recomendada

1. Rodar validator do plano antes de executar.
2. Confirmar endpoints internos disponiveis.
3. Criar tipos e cliente API interno no frontend.
4. Criar tela de clientes e versoes.
5. Criar fluxo de draft.
6. Criar editor operacional minimo.
7. Ligar validacao backend.
8. Criar preview draft.
9. Ligar publish/archive/rollback.
10. Testar com BHS e ACME.
11. Atualizar log, plano global e mapas.

## Validacoes de Aceite

- [ ] `npm.cmd run build` passa.
- [ ] `python -m pytest` no backend passa.
- [ ] Usuario interno lista clientes.
- [ ] Usuario interno cria draft para BHS.
- [ ] Draft invalido nao publica.
- [ ] Draft valido publica.
- [ ] Cliente BHS recebe versao publicada.
- [ ] Cliente ACME nao recebe configuracao BHS.
- [ ] Rollback restaura versao anterior.
- [ ] `python summarize.py` executado ao final.

## Criterios de Conclusao

- Equipe consegue configurar cliente sem editar codigo.
- Validacao impede publicacao quebrada.
- Cliente so ve versao publicada.
- Preview interno representa o comportamento real do cliente.
- Fluxo de publicacao fica pronto para receber auth/auditoria forte na Fase 7.
