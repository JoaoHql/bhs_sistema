# Fase 1: Fundacao Arquitetural

Status: concluida em 2026-07-06.

## Objetivo

Criar a base tecnica para transformar o projeto atual em uma plataforma multi-cliente confiavel, sem ainda implementar toda a modelagem Supabase, nem migrar todos os graficos para dados reais.

Esta fase deve preparar o projeto para receber backend, contratos oficiais e separacao clara entre:

- frontend visual;
- backend de aplicacao;
- configuracao de telas;
- dados dos clientes;
- permissoes;
- consultas/agregacoes.

O resultado esperado nao e "backend completo". O resultado esperado e uma fundacao limpa para que as proximas fases sejam executadas sem improviso.

## Decisao Arquitetural

O frontend nao deve mais ser tratado como dono da regra de negocio.

Ele deve evoluir para:

- renderizar modulos;
- renderizar telas;
- renderizar widgets;
- aplicar visual padronizado;
- enviar filtros permitidos;
- receber datasets prontos do backend.

O backend FastAPI sera a camada responsavel por:

- identificar usuario;
- identificar cliente;
- resolver tenant/schema;
- validar permissoes;
- carregar configuracoes publicadas;
- validar widgets/filtros/fontes;
- executar consultas;
- retornar dados seguros ao frontend.

## Escopo Desta Fase

### Incluido

- Criar estrutura base do backend FastAPI.
- Definir contratos iniciais entre frontend e backend.
- Criar camada inicial de configuracao fake/mock no backend.
- Preparar o frontend para consumir uma API de configuracao.
- Identificar e isolar pontos atuais do frontend que futuramente devem sair do navegador.
- Criar documentacao tecnica inicial da arquitetura.

### Fora do Escopo

- Conectar ao Supabase real.
- Criar schemas reais de clientes.
- Implementar RLS.
- Implementar login real.
- Criar painel administrativo completo.
- Migrar todos os graficos para API real.
- Remover todos os mocks do frontend.
- Implementar IA.

## Estrutura Backend Recomendada

Criar uma pasta de backend separada, por exemplo:

```txt
backend/
  app/
    api/
      v1/
        endpoints/
          health.py
          modules.py
          screens.py
    core/
      config.py
      errors.py
      security.py
    schemas/
      client.py
      user.py
      module.py
      screen.py
      widget.py
      filters.py
      data_source.py
    services/
      module_service.py
      screen_service.py
      permission_service.py
    repositories/
      mock_config_repository.py
    main.py
  tests/
  pyproject.toml
  README.md
```

Nesta fase, `repositories/mock_config_repository.py` pode retornar dados estaticos. O objetivo e validar o contrato, nao o banco.

## Contratos Iniciais

Definir schemas Pydantic para os conceitos centrais:

- `Client`
  - `id`
  - `name`
  - `slug`
  - `status`

- `User`
  - `id`
  - `email`
  - `name`
  - `client_id`
  - `roles`

- `Module`
  - `id`
  - `label`
  - `icon`
  - `order`
  - `screens`

- `Screen`
  - `id`
  - `module_id`
  - `label`
  - `layout`
  - `filters`
  - `widgets`

- `Widget`
  - `id`
  - `type`
  - `title`
  - `description`
  - `data_source_id`
  - `chart_config`
  - `position`

- `FilterConfig`
  - `id`
  - `field`
  - `label`
  - `type`
  - `required`
  - `allowed_values`

- `DataSource`
  - `id`
  - `kind`
  - `entity`
  - `allowed_fields`
  - `allowed_filters`

Esses contratos precisam ser compativeis com os tipos ja existentes no frontend, principalmente `AppModule`, `AppScreen`, `AppWidget` e `ChartConfig`.

## APIs Iniciais

Criar endpoints minimos:

```txt
GET /api/v1/health
GET /api/v1/me
GET /api/v1/modules
GET /api/v1/screens/{screen_id}
```

Comportamento esperado nesta fase:

- `/health` confirma que backend esta ativo.
- `/me` retorna usuario fake e cliente fake.
- `/modules` retorna lista mockada de modulos disponiveis para o cliente fake.
- `/screens/{screen_id}` retorna configuracao mockada de uma tela.

Ainda nao criar `/query` nesta fase, exceto se for apenas stub sem logica real. O endpoint de consulta pertence a Fase 4.

## Adaptacao Inicial do Frontend

Criar uma camada de client API no frontend, por exemplo:

```txt
src/services/apiClient.ts
src/services/configApi.ts
```

Responsabilidades:

- centralizar URL da API;
- buscar usuario atual;
- buscar modulos;
- buscar configuracao de tela;
- tratar erro de API;
- permitir mock controlado em desenvolvimento.

Nao espalhar `fetch` direto pelos componentes.

Nesta fase, o frontend pode continuar renderizando as telas atuais, mas deve existir um caminho inicial para renderizar configuracao recebida da API.

## Inventario Tecnico Obrigatorio

Antes de concluir a fase, registrar quais partes atuais precisam ser migradas em fases futuras:

- `src/store/dashboardStore.tsx`
  - hoje concentra dados, filtros, permissoes, workspaces, modulos e query engine;
  - deve ser dividido gradualmente.

- `src/services/dashboardData.ts`
  - hoje aceita fallback para mock;
  - em producao isso nao pode mascarar erro real.

- `src/components/shared/AskAIDrawer.tsx`
  - hoje cria/remove modulos no front;
  - deve sair do fluxo principal.

- `src/services/openaiService.ts`
  - chave e chamada OpenAI nao devem ficar no navegador.

- `src/features/cadastros/views/DynamicCanvasView.tsx`
  - deve ser mantido e fortalecido como renderizador configuravel.

- `src/components/shared/DynamicChart.tsx`
  - deve ser mantido e desacoplado gradualmente da query local.

## Regras de Implementacao

- Nao conectar no Supabase ainda.
- Nao criar schema real ainda.
- Nao implementar autenticacao real ainda.
- Nao remover telas atuais.
- Nao quebrar visual existente.
- Nao criar pagina React por cliente.
- Nao aceitar `schema_name`, `table_name` ou SQL vindos do frontend.
- Nao implementar IA nesta fase.
- Nao refatorar tudo de uma vez.

## Validacoes Tecnicas

Ao final da fase, deve ser possivel:

- iniciar o backend localmente;
- acessar `/api/v1/health`;
- acessar `/api/v1/me`;
- acessar `/api/v1/modules`;
- acessar `/api/v1/screens/{screen_id}`;
- rodar o frontend sem quebrar telas atuais;
- confirmar que existe uma camada unica de API no frontend;
- confirmar que os contratos principais estao tipados;
- confirmar que o backend mockado representa a estrutura futura real.

## Testes Minimos

### Backend

- Teste de healthcheck.
- Teste de retorno de usuario fake.
- Teste de retorno de modulos.
- Teste de tela encontrada.
- Teste de tela inexistente retornando erro adequado.
- Teste de schema Pydantic recusando payload invalido.

### Frontend

- Build do frontend.
- Renderizacao atual sem regressao.
- Teste manual ou automatizado de consumo da API mockada.
- Estado de erro visivel quando backend estiver indisponivel.

## Criterios de Aceite

A Fase 1 so deve ser considerada concluida quando:

- backend FastAPI base existir;
- contratos principais estiverem definidos;
- API inicial responder;
- frontend tiver uma camada propria para chamar backend;
- telas atuais continuarem funcionando;
- houver documento tecnico registrando o que sera migrado nas fases seguintes;
- nenhuma regra critica nova for adicionada ao frontend;
- nao houver dependencia de Supabase real para rodar a fase.

## Entregaveis

- Backend FastAPI inicial.
- Schemas Pydantic principais.
- Endpoints iniciais.
- Mock repository de configuracao.
- Camada `configApi` no frontend.
- Documento de inventario tecnico.
- Testes minimos da fundacao.

## Riscos Desta Fase

- Tentar implementar Supabase cedo demais.
- Refatorar o frontend inteiro antes do contrato estabilizar.
- Criar endpoints ja acoplados a telas especificas.
- Manter regras criticas no frontend por comodidade.
- Criar um backend que apenas replica o mock atual sem preparar multi-cliente.

## Proxima Fase

Depois desta fase, iniciar a Fase 2: modelagem Supabase/Postgres.

A Fase 2 deve usar os contratos definidos aqui para criar `app_core`, schemas por cliente e validacao estrutural dos tenants.
