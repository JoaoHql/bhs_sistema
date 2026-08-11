# Plano Global: Plataforma Multi-Cliente com Backend Confiavel

## Resumo

Transformar o projeto atual de modelo visual/frontend em uma plataforma SaaS multi-cliente, com backend FastAPI, banco Supabase/Postgres e isolamento por schema de cliente.

O frontend deve deixar de ser dono da logica de dados e virar um renderizador padronizado de telas, graficos, filtros e layouts. O backend passa a controlar cliente, permissoes, configuracao publicada, validacao, consultas e seguranca.

Decisao central: nao criar paginas React novas por cliente. Cada cliente tera uma configuracao versionada de modulos, telas e graficos, validada e publicada pela equipe interna.

## Fase 1: Fundacao Arquitetural

Status: concluida em 2026-07-06.

- Separar claramente frontend visual, backend de aplicacao, banco de dados, configuracoes por cliente e schemas de dados dos clientes.
- Criar backend FastAPI em camadas: API versionada, services, repositories, schemas Pydantic e core/config/security.
- Definir contrato oficial entre frontend e backend: `Client`, `User`, `Module`, `Screen`, `Widget`, `ChartConfig`, `FilterConfig`, `DataSource` e `PublishedVersion`.
- Remover dependencia futura de logica critica dentro do front: dados mockados como fonte principal, agregacoes locais, permissoes locais e criacao definitiva de modulos no navegador.

### Criterio de conclusao

- Backend inicial criado.
- Front consegue consumir configuracao mockada via contrato real.
- Tipos principais definidos e documentados.

## Fase 2: Modelagem Supabase/Postgres

Status: concluida em 2026-07-06.

- Criar schema comum da plataforma, exemplo: `app_core`.
- `app_core` guarda clientes, usuarios, vinculo usuario-cliente, permissoes, catalogo de modulos, catalogo de telas, catalogo de widgets, versoes publicadas por cliente e fontes de dados permitidas.
- Criar um schema por cliente, exemplo: `tenant_cliente_a`, `tenant_cliente_b`.
- Todos os schemas de cliente devem seguir template padronizado.
- Criar mecanismo de validacao para garantir que cada schema possui as tabelas/views esperadas.
- O frontend nunca deve receber nem enviar nome de schema livremente.

### Criterio de conclusao

- Dois clientes de teste funcionando no mesmo banco.
- Cada cliente com schema separado.
- Backend resolve automaticamente o schema correto.
- Usuario de um cliente nao acessa dados de outro.

## Fase 3: Motor de Configuracao de Telas

Status: concluida em 2026-07-06.

- Criar sistema de configuracao versionada por cliente.
- Cada versao publicada define modulos visiveis, telas visiveis, widgets usados, filtros disponiveis, fonte de dados de cada widget e permissoes necessarias.
- Criar estados de versao: `draft`, `validated`, `published`, `archived`.
- Criar rollback para versao anterior.
- A equipe interna cria e valida versoes antes de publicar.
- Clientes nao editam telas nesta fase.

### Criterio de conclusao

- Cliente A e cliente B recebem telas diferentes sem alterar codigo React.
- E possivel publicar uma nova versao para um cliente.
- E possivel voltar para versao anterior.

## Fase 4: Backend de Consulta e Agregacao

Status: concluida em 2026-07-07

- Criar endpoint principal de dados: `POST /api/v1/query`.
- Backend recebe `screen_id`, `widget_id` e filtros permitidos.
- Backend valida usuario, cliente, permissao, tela publicada, widget publicado, filtros permitidos e fonte de dados permitida.
- Backend executa consulta no schema correto.
- Backend retorna dados prontos para grafico/tabela.
- Nenhum SQL livre deve vir do frontend.

### Criterio de conclusao

- Graficos principais alimentados por API real.
- Filtros funcionando via backend.
- Consultas invalidas bloqueadas.
- Nenhum dado sensivel depende de validacao apenas no frontend.

## Fase 5: Adaptacao do Frontend Atual

Status: concluida em 2026-07-07
Plano detalhado: `plans/FASE_5_ADAPTACAO_FRONTEND_BACKEND.md`

- Preservar padrao visual existente.
- Transformar telas atuais em referencias/presets reutilizaveis.
- Manter e fortalecer `DynamicChart`, `DynamicCanvasView`, componentes de filtro, cards/KPIs, tabelas e layouts definidos.
- Substituir gradualmente dados locais por chamadas ao backend.
- Remover fallback silencioso para mock em ambiente real.
- Manter mock apenas para desenvolvimento controlado.

### Criterio de conclusao

- Front renderiza telas vindas do backend.
- Layout atual preservado.
- Graficos e filtros seguem o mesmo padrao visual.
- Uma nova tela pode ser criada por configuracao, nao por novo arquivo React.

## Fase 6: Ferramenta Interna de Publicacao

Status: planejada.
Plano detalhado: `plans/FASE_6_FERRAMENTA_INTERNA_PUBLICACAO.md`

- Criar area administrativa apenas para equipe interna.
- Funcoes minimas: listar clientes, ver versoes publicadas, criar draft, escolher modulos/telas/widgets, configurar filtros, validar, pre-visualizar como cliente, publicar, arquivar e restaurar versao anterior.
- IA nao entra no fluxo principal agora.
- IA pode permanecer como recurso futuro, interno e desativado para clientes.

### Criterio de conclusao

- Equipe consegue configurar cliente sem editar codigo.
- Validacao impede publicacao quebrada.
- Cliente so ve versao publicada.

## Fase 7: Seguranca, Auditoria e Confiabilidade

Status: planejada.
Plano detalhado: `plans/FASE_7_SEGURANCA_AUDITORIA_CONFIABILIDADE.md`

- Implementar autenticacao com Supabase Auth ou JWT compativel.
- Backend deve ser autoridade de tenant/permissao.
- Aplicar RLS e grants com cuidado no Supabase.
- Evitar expor schemas de cliente diretamente via Data API.
- Criar logs/auditoria para login, publicacao de versao, alteracao de configuracao, execucao de consultas criticas e erros de validacao.
- Criar testes de isolamento entre clientes.

### Criterio de conclusao

- Teste prova que cliente A nao acessa cliente B.
- Publicacoes ficam auditaveis.
- Erros de configuracao sao bloqueados antes de producao.

## Fase 8: Escala e Operacao

Status: concluida.
Plano detalhado: `plans/FASE_8_ESCALA_OPERACAO.md`

- Criar processo padrao para onboarding de cliente: cadastrar cliente, criar schema, aplicar template, carregar dados, validar schema, criar versao inicial e publicar.
- Criar processo de atualizacao de template: migration comum, validacao por cliente e relatorio de impacto.
- Criar monitoramento basico: erros de API, tempo de consulta, falhas por cliente e widgets quebrados.
- Criar documentacao operacional para equipe.

### Criterio de conclusao

- Novo cliente pode ser criado por processo repetivel.
- Atualizacao de schema nao quebra clientes existentes.
- Time consegue diagnosticar erro por cliente/tela/widget.

## Decisoes Fixadas

- Backend proprio: FastAPI/Python.
- Banco: Supabase/Postgres.
- Multi-cliente: schema por cliente.
- Configuracao: versionada por cliente.
- Criacao de telas: equipe interna.
- Cliente nao edita telas agora.
- IA fora do foco atual.
- Frontend preserva visual atual e vira renderizador.
- Codigo React novo por cliente nao e o caminho padrao.

## Riscos Principais

- Schemas dos clientes divergirem entre si.
- Configuracao publicada apontar para campo inexistente.
- Front continuar carregando regra critica.
- Backend aceitar schema/tabela/campo vindo livremente do frontend.
- Supabase expor schema indevidamente.
- Mock mascarar erro real.
- Criar admin visual cedo demais e atrasar a fundacao.

## Proximos Planos Derivados

- Plano 1: criacao do backend FastAPI base.
- Plano 2: modelagem `app_core` e schemas de cliente.
- Plano 3: contrato frontend-backend para modulos/telas/widgets.
- Plano 4: endpoint `/query` e motor de agregacao.
- Plano 5: adaptacao do frontend atual.
- Plano 6: ferramenta interna de publicacao.
- Plano 7: seguranca, testes e auditoria.
- Plano 8: onboarding de novos clientes.
