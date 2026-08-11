# Log: WhatsApp em producao

## 2026-07-16 - Fase 1

- Status inicial: nao iniciada.
- Escopo: tres tabelas ficticias de metricas em `tenant_gelobel`.
- Nao objetivos: catalogo, frontend, APIs, usuarios, provider, worker e envios.
- Status final: concluida.
- Arquivo implementado: `supabase/migrations/20260716120000_gelobel_whatsapp_metricas_ficticias.sql`.
- Banco: migration aplicada e reaplicada com sucesso usando a conexao local configurada.
- Dados: 4 linhas diarias, 3 mensais e 3 anuais.
- Validacao: JSON, datas de granularidade, percentual de amostra, RLS e privilegios aprovados.
- Regressao: fingerprint das tabelas preexistentes de `tenant_gelobel` preservado.

## 2026-07-16 - Fase 2

- Status inicial: nao iniciada (0 de 6 itens).
- Escopo: catalogo semantico interno das metricas diaria, mensal e anual da Gelobel.
- Nao objetivos: API, frontend, editor, agendamentos, usuarios, telefones, provider, worker, teste e envios.
- Status final: concluida (6 de 6 itens).
- Arquivos implementados: `supabase/migrations/20260716210335_gelobel_whatsapp_metricas_catalogo.sql` e `configs/tenants/gelobel.yaml`.
- Banco: migration aplicada e reaplicada; IDs das fontes permaneceram estaveis.
- Catalogo: 3 fontes, 21 campos diarios, 21 mensais, 13 anuais e 3 contextos de granularidade.
- Seguranca: RLS ativo; `anon`/`authenticated` sem privilegios; CRUD da `service_role` confirmado.
- Validacao: chaves permitidas iguais as chaves JSON das tabelas, filtros vazios e 6 testes de configuracao/contrato aprovados.
- Advisors: nenhuma ocorrencia em nivel de erro; CLI retornou apenas timeout de telemetria ao encerrar.
- Regressao: dados das tres tabelas de metricas e telas Gelobel preservados.

## 2026-07-16 - Fase 3

- Status inicial: nao iniciada (0 de 6 itens).
- Escopo: persistencia de telefones, timezone, automacoes, horarios, destinatarios, execucoes e entregas da Gelobel.
- Nao objetivos: API, frontend, editor, provider, worker, botao de teste, processamento e envios.
- Status final: concluida (6 de 6 itens).
- Arquivo implementado: `supabase/migrations/20260716211410_gelobel_whatsapp_automacoes.sql`.
- Banco: migration aplicada e reaplicada com sucesso; nenhuma linha temporaria permaneceu.
- Modelo: telefone E.164 por vinculo usuario/tenant, timezone `America/Bahia`, 5 tabelas operacionais e destinatarios explicitamente selecionados.
- Historico: execucoes agendadas/de teste, snapshots de metricas, periodos, mensagem, telefone e entrega.
- Seguranca: RLS ativo; `anon`/`authenticated` sem privilegios; 20 grants CRUD da `service_role` confirmados.
- Validacao: grafo relacional valido e rejeicao de telefone invalido, horario duplicado, destinatario de outro tenant e teste associado a horario.
- Testes: 35 testes de configuracao, catalogo e gestao de usuarios aprovados.
- Advisors: nenhuma ocorrencia em nivel de erro; CLI retornou apenas timeout de telemetria ao encerrar.
- Regressao: fingerprints das metricas e telas, quantidades de usuarios e vinculos preservados; catalogo e YAML Gelobel nao alterados.

## 2026-07-16 - Fase 4

- Status inicial: nao iniciada (0 de 5 itens).
- Escopo: API base somente leitura para o bootstrap da configuracao WhatsApp da Gelobel.
- Nao objetivos: CRUD, telefone, frontend, editor, preview, provider, worker, teste e envios.
- Status final: concluida (5 de 5 itens).
- Endpoint: `GET /api/v1/tenant/whatsapp/bootstrap`, restrito ao MASTER.
- Camadas: schemas Pydantic, repositorio Postgres, servico e router FastAPI versionado.
- Banco: consulta real confirmou timezone `America/Bahia`, 3 grupos, 55 variaveis, 2 destinatarios ativos e 1 MASTER.
- Seguranca: ator e tenant validados no SQL; outros tenants e usuarios sem papel MASTER sao rejeitados.
- Testes: suite backend completa aprovada, 98 testes.
- Regressao: nenhum schema, dado, frontend, menu ou tela foi alterado nesta fase.

## 2026-07-16 - Fase 5

- Status inicial: nao iniciada (0 de 5 itens).
- Escopo: API de configuracao das automacoes, horarios e destinatarios explicitos da Gelobel.
- Nao objetivos: frontend, telefone, preview, variaveis resolvidas, provider, worker, teste e envios.
- Status final: concluida (5 de 5 itens).
- Endpoints: listar, detalhar, criar, substituir integralmente e excluir em `/api/v1/tenant/whatsapp/automations`.
- Seguranca: acesso somente ao MASTER Gelobel, com ator, tenant e destinatarios ativos validados no banco.
- Atomicidade: gravacao real confirmou rollback integral ao receber destinatario inexistente; registro original permaneceu intacto.
- Contrato: nome e mensagem nao vazios, horarios locais unicos, destinatarios UUID explicitos e selecoes nao vazias.
- Testes: suite backend completa aprovada, 101 testes; OpenAPI confirmou os cinco metodos e resposta 201 na criacao.
- Regressao: nenhum schema, dado permanente, frontend, menu, tela, provider ou envio foi alterado.

## 2026-07-16 - Fase 6

- Status inicial: nao iniciada (0 de 4 itens).
- Escopo: tornar real somente o gesto existente de Pausar/Ativar no acesso Gelobel.
- Nao objetivos: demais controles visuais, telefone, preview real, teste, provider, worker e envios.
- Status final: concluida (4 de 4 itens).
- Runtime: equipe preservada no adapter mockado; Gelobel passou a carregar bootstrap e automacoes pela API.
- Persistencia: `PUT` altera o status usando a configuracao persistida, sem salvar edicoes locais acidentalmente.
- UX: botao fica indisponivel suavemente durante a requisicao; falha mantem o estado anterior e informa o erro.
- Navegador: pausa confirmada, recarga confirmou o status persistido e o registro temporario foi removido.
- Smoke Gelobel: Mensagens, Disparos no WhatsApp, Simuladores, Simulador de Combos e Configuracoes presentes.
- Validacao: build e lint dos arquivos alterados aprovados; 101 testes backend aprovados; lint global permanece com 127 problemas preexistentes fora do escopo.
- Configuracao permanente: criada `Resumo executivo Gelobel`, pausada, agendada as 08:00, com o MASTER como destinatario e 7 tokens validos do catalogo.
- Pendencia operacional: o MASTER Gelobel ainda nao possui telefone WhatsApp configurado; necessario antes de envios futuros.
