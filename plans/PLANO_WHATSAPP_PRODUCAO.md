# Plano: WhatsApp em producao

## Fase 1 - Tabelas ficticias de metricas WhatsApp

- [x] Criar as tres tabelas de metricas somente em `tenant_gelobel`.
- [x] Garantir chave de periodo, metricas JSONB, data de atualizacao e constraints de granularidade.
- [x] Inserir massa ficticia idempotente com 4 dias, 3 meses e 3 anos.
- [x] Habilitar RLS, bloquear `anon`/`authenticated` e autorizar `service_role`.
- [x] Validar existencia, constraints, quantidade, JSON, percentuais e permissoes.
- [x] Confirmar que tabelas Gelobel existentes e os nao objetivos da fase foram preservados.

### Nao objetivos

- Catalogo semantico, frontend, APIs, usuarios, telefones, provider, worker e envios.

## Fase 2 - Catalogo semantico das metricas WhatsApp

- [x] Registrar para a Gelobel as fontes diaria, mensal e anual usando as tabelas da Fase 1.
- [x] Catalogar `periodo_inicio` e as variaveis de faturamento, devolucao, custo e preco total com nomes legiveis e tipos corretos.
- [x] Manter filtros indisponiveis e expor somente campos aprovados para futuras mensagens.
- [x] Tornar migration e configuracao declarativa idempotentes e coerentes entre si.
- [x] Preservar RLS e acesso exclusivo da `service_role` no catalogo interno.
- [x] Validar fontes, campos, granularidades, permissoes e ausencia de regressao nas tabelas e telas existentes da Gelobel.

### Nao objetivos

- API, frontend, editor de mensagem, agendamentos, usuarios, telefones, provider, worker, botao de teste e envios.

## Fase 3 - Estrutura de automacoes WhatsApp

- [x] Adicionar telefone WhatsApp por vinculo de usuario/tenant e timezone do tenant, sem alterar os acessos existentes.
- [x] Criar em `tenant_gelobel` as tabelas de automacoes, horarios e destinatarios com integridade referencial.
- [x] Modelar destinatarios como selecao explicita, permitindo incluir ou retirar o MASTER e qualquer usuario da Gelobel.
- [x] Criar historico de execucoes e entregas preparado para rastrear sucesso, falha, ausencia de dados e valores desatualizados.
- [x] Aplicar indices, constraints, RLS e acesso exclusivo da `service_role` em todas as novas tabelas.
- [x] Validar idempotencia, timezone, telefone, relacionamentos, permissoes e ausencia de regressao nas metricas, catalogo, usuarios e telas Gelobel.

### Nao objetivos

- API, frontend, alteracao da tela mockada, editor, catalogo adicional, provider, worker, botao de teste, processamento de agendamentos e envios reais.

## Fase 4 - API base de leitura do WhatsApp

- [x] Criar contrato tipado para retornar timezone, variaveis aprovadas e destinatarios elegiveis da Gelobel.
- [x] Implementar repositorio e servico em camadas, com consultas somente leitura e isolamento pelo tenant autenticado.
- [x] Expor um endpoint bootstrap versionado, acessivel somente ao MASTER do tenant.
- [x] Garantir que o catalogo retorne apenas as tres fontes WhatsApp ativas e que os destinatarios incluam MASTER e usuarios ativos com telefone opcional.
- [x] Cobrir autorizacao, isolamento, contrato e ausencia de regressao nos endpoints existentes.

### Nao objetivos

- CRUD de automacoes, alteracao de telefone, frontend, editor, preview, provider, worker, botao de teste, processamento de horarios e envios reais.

## Fase 5 - API de configuracao das automacoes WhatsApp

- [x] Criar contratos tipados para automacao, horarios locais e selecao explicita de destinatarios.
- [x] Expor listagem, detalhe, criacao, atualizacao integral e exclusao, somente para o MASTER Gelobel.
- [x] Persistir automacao, horarios e destinatarios em uma unica transacao com isolamento pelo tenant autenticado.
- [x] Validar destinatarios ativos do mesmo tenant, horarios unicos e mensagem/nome obrigatorios.
- [x] Cobrir contrato, autorizacao, isolamento, atomicidade e regressao dos endpoints existentes.

### Nao objetivos

- Frontend, alteracao de telefone, preview, resolucao de variaveis, provider, worker, botao de teste, processamento de horarios e envios reais.

## Fase 6 - Ativar e pausar automacoes na tela Gelobel

- [x] Manter a versao da equipe usando o adapter mockado e carregar automacoes reais somente no acesso Gelobel.
- [x] Adaptar o contrato da API ao template existente sem alterar sua estrutura visual ou o gesto Pausar/Ativar.
- [x] Persistir Pausar/Ativar pela API, bloquear repeticao durante a requisicao e preservar o estado anterior em caso de falha.
- [x] Remover mensagens de mock dessa dinamica no tenant e validar build, acesso Gelobel, menus e regressao backend.
- [x] Cadastrar uma automacao permanente e pausada para o MASTER Gelobel visualizar e ativar em producao.

### Nao objetivos

- Producao dos demais controles da tela, criacao/edicao/exclusao visual, telefones, preview real, botao de teste, provider, worker e envios.
