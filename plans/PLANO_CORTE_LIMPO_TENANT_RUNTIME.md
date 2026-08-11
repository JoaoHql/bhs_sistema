# Plano Tecnico: Corte Limpo Tenant Runtime + Laboratorio Interno

## Resumo

Separar definitivamente o sistema em dois runtimes:

- Cliente final: acessa apenas telas publicadas do proprio tenant, com dados reais do Supabase/schema configurado.
- Equipe interna: acessa console de configuracao de clientes e laboratorio mockado para criar novos visuais/templates reutilizaveis.

O mock deixa de ser modo operacional do cliente. Ele passa a ser ferramenta interna da equipe para prototipar graficos, validar ideias visuais e transformar bons modelos em templates reutilizaveis.

## Objetivo

Garantir que:

- usuario cliente novo nao veja nenhuma tela por padrao;
- cliente veja somente telas publicadas para seu tenant;
- staff nao caia no dashboard de cliente;
- staff tenha area interna para configurar qualquer cliente;
- mock exista apenas no contexto interno da equipe;
- graficos/telas reais usem Supabase, schema do cliente, catalogo, bindings e versao publicada.

## Decisao de Arquitetura

### Runtime cliente

O runtime cliente deve depender somente de:

- login autenticado;
- `client_slug` resolvido pelo token;
- `/api/v1/modules`;
- `/api/v1/screens/{screen_id}`;
- `/api/v1/query`;
- versao publicada em `app_core.published_versions`.

Se o tenant nao tiver versao publicada ou nao tiver telas, o frontend deve mostrar estado vazio: "Nenhuma tela publicada".

Nao deve haver fallback para:

- `initialModules`;
- telas hardcoded antigas;
- dados mockados;
- `analises-overview`;
- `financeiro-*`;
- `ads-*`;
- `simuladores-*`;
- qualquer dashboard global.

### Runtime equipe

O runtime equipe deve depender de `is_staff=true`.

Staff deve abrir area interna com:

- lista de clientes;
- cadastro/edicao de data sources;
- catalogo semantico de campos;
- templates visuais;
- bindings por cliente;
- screen instances;
- composicao de draft;
- validacao/publicacao;
- laboratorio mockado.

Staff nao deve abrir automaticamente dashboard de nenhum cliente.

### Laboratorio mockado

O laboratorio mockado deve ficar acessivel somente para equipe.

Funcao do laboratorio:

- criar novos visuais;
- simular dados;
- testar layout;
- transformar visual aprovado em `visual_template`.

O laboratorio nao deve publicar tela de cliente diretamente. Para virar tela real, precisa passar por:

1. template;
2. binding com campos reais;
3. screen instance;
4. draft;
5. validacao;
6. publicacao.

## Mudancas Tecnicas Necessarias

### Frontend

- Alterar estado inicial de aba/tela:
  - remover `currentTab = 'analises-overview'`;
  - definir tela inicial apos carregar `/api/v1/modules`;
  - se houver modulo/tela publicada, abrir primeira tela;
  - se nao houver, mostrar estado vazio.
- Separar renderizacao por perfil:
  - `currentUser.is_staff === true` -> renderizar console interno;
  - `currentUser.is_staff !== true` -> renderizar runtime cliente.
- Remover menus fixos do runtime cliente:
  - analises;
  - financeiro;
  - ads;
  - simuladores;
  - cadastros antigos;
  - configuracoes mockadas.
- Manter menus antigos apenas dentro do laboratorio interno, se forem uteis para prototipacao.
- Remover seletor Mock/API do cliente.
- Ignorar `localStorage bhs:data-mode` no runtime cliente.
- Tratar erro de API diferente de tenant vazio:
  - erro API: aviso tecnico;
  - tenant sem tela: estado vazio normal.

### Backend

- Manter contrato atual:
  - `GET /api/v1/me`;
  - `GET /api/v1/modules`;
  - `GET /api/v1/screens/{screen_id}`;
  - `POST /api/v1/query`;
  - `/api/v1/internal/*` para equipe.
- Garantir que `GET /api/v1/modules` retorne lista vazia quando cliente nao tem publicacao.
- Garantir que staff sem tenant nao use `default_client_slug`.
- Garantir que cliente final sempre execute queries no `client_slug` do token.
- Garantir que endpoints internos exigem `is_staff=true`.

### Dados e Publicacao

Fluxo oficial para criar tela real:

1. Criar ou escolher cliente.
2. Definir schema Supabase do cliente.
3. Criar data source apontando para tabela/view.
4. Catalogar campos tecnicos e semanticos.
5. Escolher/criar visual template.
6. Criar tenant template binding.
7. Criar screen instance.
8. Compor draft.
9. Validar.
10. Publicar.
11. Cliente loga e ve tela publicada.

## Riscos

### Riscos altos

- Frontend antigo continuar renderizando telas por prefixo (`analises-*`, `financeiro-*`, `ads-*`, `simuladores-*`) e furar isolamento por tenant.
- Staff cair no tenant default local (`bhs-demo`) por causa de fallback de desenvolvimento.
- Cliente sem tela publicada receber tela mockada por fallback visual.
- Query real usar data source de outro tenant se `client_slug` nao for derivado do token.

### Riscos medios

- `localStorage` manter `bhs:data-mode=mock` e causar comportamento divergente entre maquinas.
- Laboratorio mockado parecer area de producao se nao houver separacao visual clara.
- Tela vazia ser interpretada como erro, confundindo usuario e equipe.
- Templates criados no laboratorio nao terem contrato semantico suficiente para virar binding real.
- Testes existentes quebrarem por esperarem `initialModules` no boot.

### Riscos baixos

- Usuarios antigos estranharem remocao dos menus demo.
- Necessidade de migrar alguns componentes antigos para templates aos poucos.
- Nomes de campos variando entre schemas exigirem catalogo semantico mais completo.

## Criterios de Aceite

- Login `staff@bhs.com.br` abre console interno, nao dashboard BHS.
- Login `admin@bhs.demo` abre somente runtime do tenant `bhs-demo`.
- Cliente sem tela publicada ve estado vazio.
- Cliente nao ve laboratorio, seletor Mock/API nem menus demo.
- Staff ve laboratorio mockado.
- Staff consegue escolher cliente e configurar telas.
- Tela publicada consulta dados reais do schema do cliente.
- Falha de API nao aplica mock silencioso.
- Build frontend passa.
- Testes backend passam.

## Testes Recomendados

### Frontend

- Testar renderizacao por perfil:
  - staff;
  - cliente com tela;
  - cliente sem tela.
- Testar ausencia de menus mockados no cliente.
- Testar estado vazio sem erro.
- Testar troca de usuario limpando estado anterior.
- Testar `localStorage` com `bhs:data-mode=mock` e cliente ainda usando runtime real.

### Backend

- Testar `/me` para staff.
- Testar `/me` para cliente.
- Testar `/modules` com tenant publicado.
- Testar `/modules` com tenant sem publicacao.
- Testar `/query` bloqueando acesso cruzado.
- Testar endpoints internos bloqueando usuario nao staff.

## Ordem Recomendada de Execucao

1. Separar shell por perfil no frontend.
2. Corrigir tela inicial do cliente baseada em modulos publicados.
3. Remover menus hardcoded do runtime cliente.
4. Isolar laboratorio mockado dentro da area staff.
5. Remover seletor Mock/API do cliente.
6. Validar staff sem tenant.
7. Validar tenant vazio.
8. Rodar testes/build.

## Fora de Escopo Agora

- IA criando tela automaticamente.
- Editor visual complexo.
- Multi-tenant por banco separado.
- Permitir cliente editar templates.
- Publicacao direta a partir do laboratorio sem binding real.

## Premissas

- Supabase continua sendo banco unico.
- Cada cliente continua tendo schema proprio.
- Templates sao reutilizaveis entre clientes.
- Bindings fazem a ponte entre template e campos reais.
- Codex pode continuar criando/configurando telas via codigo/config enquanto nao existe editor visual completo.
