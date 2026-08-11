# Plano Enriquecido da Fase 3

## Fase 3: Motor de Configuracao de Telas

Status: concluida
Data do plano: 2026-07-06

- [x] Banco suporta versoes `draft`, `validated`, `published`, `archived`.
- [x] Backend le configuracao publicada real por cliente.
- [x] Endpoints internos de versionamento criados.
- [x] Validacao bloqueia configuracao invalida.
- [x] Publicacao arquiva versao anterior.
- [x] Rollback restaura versao anterior valida.
- [x] BHS e ACME recebem configuracoes diferentes.
- [x] Testes backend e build frontend executados.
- [x] Log e mapas de contexto atualizados.

### Objetivo

Transformar o backend no dono da configuracao publicada de cada cliente, permitindo que clientes diferentes recebam modulos, telas, widgets e filtros diferentes sem criar novos arquivos React por cliente.

Ao final desta fase, o frontend deve continuar preservando o layout visual existente, mas a decisao sobre "o que aparece para cada cliente" deve vir do backend via configuracao versionada.

### Decisao central

Nao criar paginas React especificas por cliente.

Cada cliente tera uma versao publicada em `app_core.published_versions.config`. Essa versao sera um snapshot fechado contendo:

- cliente;
- versao;
- modulos visiveis;
- telas visiveis;
- widgets visiveis;
- filtros permitidos;
- fontes de dados permitidas por widget;
- permissoes minimas;
- metadados de publicacao;
- compatibilidade com o contrato atual do frontend.

### Estado atual relevante

- Fase 1 criou backend FastAPI em camadas.
- Fase 1 criou contratos Pydantic para `Client`, `User`, `Module`, `Screen`, `Widget`, `FilterConfig`, `DataSource` e `PublishedVersion`.
- Fase 1 ainda usa `MockConfigRepository`.
- Fase 2 criou `app_core` e schemas tenant no Supabase/Postgres.
- Fase 2 criou catalogos base: `clients`, `modules`, `screens`, `filters`, `data_sources`, `widgets`, `client_screen_permissions`, `published_versions`.
- `published_versions.status` hoje aceita `draft`, `published`, `archived`; falta `validated`.
- O frontend ja tem caminho inicial para consumir `/modules` e `/screens/{screen_id}`, mas ainda tem grande parte da experiencia local/mockada.

### Fora do escopo desta fase

- Nao criar ferramenta administrativa visual completa. Isso fica para Fase 6.
- Nao criar endpoint de dados/agregacao `POST /api/v1/query`. Isso fica para Fase 4.
- Nao permitir SQL livre vindo do frontend.
- Nao permitir schema enviado pelo frontend.
- Nao conectar IA ao fluxo principal de publicacao.
- Nao refatorar todas as telas antigas agora.

### Entregaveis

- [x] Modelo formal de configuracao publicada.
- [x] Estado `validated` suportado em banco e backend.
- [x] Repository real para ler configuracao em `app_core`.
- [x] Servico de versionamento com draft, validacao, publicacao, rollback e arquivamento.
- [x] Endpoints internos minimos para gerenciar versoes.
- [x] Endpoints cliente continuam simples: `/modules` e `/screens/{screen_id}` retornam somente a versao publicada.
- [x] Validadores impedem publicacao quebrada.
- [x] Cliente A e Cliente B recebem configuracoes diferentes sem alterar React.
- [x] Testes automatizados cobrindo isolamento, publicacao e rollback.
- [x] Log de execucao salvo em `plans/logs/FASE_3_EXECUCAO.md`.
- [x] `python summarize.py` executado ao fechar a fase.

### Contrato da configuracao publicada

A configuracao publicada deve ser tratada como snapshot imutavel. Alteracoes novas entram como nova versao.

Estrutura alvo em JSON:

```json
{
  "schemaVersion": 1,
  "client": {
    "id": "uuid",
    "slug": "bhs-demo",
    "name": "BHS Demo"
  },
  "version": 1,
  "modules": [
    {
      "id": "demo-vendas",
      "label": "Demo Vendas",
      "icon": "BarChart3",
      "sortOrder": 10,
      "screens": [
        {
          "id": "demo-vendas",
          "label": "Demo Vendas",
          "layout": "dashboard",
          "sortOrder": 10
        }
      ]
    }
  ],
  "screens": [
    {
      "id": "demo-vendas",
      "moduleId": "demo-vendas",
      "label": "Demo Vendas",
      "layout": "dashboard",
      "filters": [],
      "components": []
    }
  ],
  "permissions": {
    "requiredRoles": ["viewer"]
  },
  "publishedAt": "2026-07-06T00:00:00Z",
  "publishedBy": "uuid"
}
```

Regra: o backend pode armazenar UUIDs internamente, mas o contrato publico para o frontend deve continuar usando chaves estaveis (`key`/slug) como `id`, para nao acoplar React a IDs de banco.

### Regras de validacao obrigatorias

Uma versao so pode virar `validated` se:

- cliente existe e esta ativo;
- todos os modulos existem;
- todas as telas existem;
- todas as telas pertencem aos modulos declarados;
- todos os widgets existem e pertencem as telas declaradas;
- todos os filtros pertencem as telas declaradas;
- toda fonte de dados existe, esta ativa e pertence ao cliente ou e global permitida;
- todo campo usado em metricas, dimensoes e filtros existe em `allowed_fields` ou `allowed_filters`;
- nenhum widget aponta para fonte de dados de outro cliente;
- nenhum componente usa `workspaceId` inexistente;
- `gridSpan` esta dentro do contrato aceito;
- `layout` esta dentro do contrato aceito;
- existe pelo menos um modulo e uma tela para a versao publicada;
- somente uma versao pode ficar `published` por cliente;
- rollback nao pode publicar versao invalida no contrato atual.

### Riscos graves que esta fase deve eliminar

- Cliente ver tela de outro cliente.
- Frontend receber widget apontando para campo inexistente.
- Publicar configuracao sem tela ou sem fonte de dados valida.
- Criar divergencia entre o catalogo do banco e o contrato Pydantic.
- Permitir que o frontend escolha schema, tabela ou SQL.
- Quebrar o layout visual atual por mudar contrato de tela sem adaptador.
- Publicar versao parcial e deixar cliente sem dashboard.
- Perder rollback funcional.

### Arquitetura alvo

### Banco

Alteracoes previstas:

- ajustar `app_core.published_versions.status` para aceitar `draft`, `validated`, `published`, `archived`;
- garantir indice parcial para uma unica versao `published` por cliente;
- adicionar campos opcionais de auditoria se necessario:
  - `validated_by`;
  - `validated_at`;
  - `archived_at`;
  - `source_version_id`;
- criar funcoes SQL seguras para:
  - validar unicidade de versao publicada;
  - recuperar versao publicada por cliente;
  - arquivar versao publicada anterior durante publicacao.

### Backend

Novos componentes sugeridos:

- `backend/app/repositories/config_repository.py`
  - leitura real de `app_core`;
  - carregamento de versao publicada;
  - carregamento de draft;
  - persistencia de draft/validated/published/archived;
  - sem SQL dinamico com schema vindo do usuario.

- `backend/app/services/version_service.py`
  - criar draft;
  - validar draft;
  - publicar versao validada;
  - rollback para versao anterior;
  - arquivar versao;
  - montar snapshot de configuracao.

- `backend/app/services/config_validation_service.py`
  - validar integridade de modulos/telas/widgets/filtros/fontes;
  - validar campos permitidos;
  - validar compatibilidade com schemas Pydantic.

- `backend/app/schemas/config_version.py`
  - contratos de request/response para draft, validacao, publicacao e rollback.

- `backend/app/api/v1/endpoints/config_versions.py`
  - rotas internas de gerenciamento.

### Endpoints minimos

Endpoints cliente:

- `GET /api/v1/modules`
  - retorna modulos da versao publicada do cliente do usuario.

- `GET /api/v1/screens/{screen_id}`
  - retorna tela da versao publicada do cliente do usuario.

Endpoints internos:

- `GET /api/v1/internal/clients/{client_slug}/versions`
- `POST /api/v1/internal/clients/{client_slug}/versions/draft`
- `POST /api/v1/internal/clients/{client_slug}/versions/{version}/validate`
- `POST /api/v1/internal/clients/{client_slug}/versions/{version}/publish`
- `POST /api/v1/internal/clients/{client_slug}/versions/{version}/rollback`
- `POST /api/v1/internal/clients/{client_slug}/versions/{version}/archive`

Nesta fase, esses endpoints podem ser protegidos por dependencia simples de usuario interno, mas a regra deve ficar explicita para endurecimento na Fase 7.

### Sequencia de execucao

### 1. Preflight

- [x] Rodar validador da fase:
  - `powershell.exe -ExecutionPolicy Bypass -File C:\Users\muber\.codex\skills\phase-plan-validator\scripts\validate-phase.ps1 -PlanFile plans\FASE_3_MOTOR_CONFIGURACAO_TELAS.md -PhaseLabel "Fase 3"`
- [x] Rodar `git status --short`.
- [x] Confirmar que nao ha arquivo de plano de Fase 3 duplicado.

### 2. Migracao de banco

- [x] Criar migration em `supabase/migrations/`.
- [x] Adicionar `validated` ao fluxo de status.
- [x] Criar restricao/indice para apenas uma versao publicada por cliente.
- [x] Criar dados de exemplo com configuracoes diferentes para `bhs-demo` e `acme-demo`.
- [x] Validar via consulta que os dois clientes possuem snapshots diferentes.

### 3. Contratos Pydantic

- [x] Criar schemas para versoes de configuracao.
- [x] Garantir `extra="forbid"` nos contratos novos.
- [x] Garantir alias compatível com frontend (`moduleId`, `gridSpan`, `dataSourceId`, `chartConfig`).
- [x] Criar testes de payload valido e invalido.

### 4. Repository real

- [x] Criar repository real para `app_core`.
- [x] Manter mock isolado apenas para testes/fallback explicito.
- [x] Trocar dependency injection para repository real quando `DATABASE_URL` existir.
- [x] Evitar que qualquer request escolha schema/tabela.

### 5. Servico de validacao

- [x] Validar referencias internas.
- [x] Validar campos permitidos por fonte de dados.
- [x] Validar contrato final com Pydantic antes de marcar `validated`.
- [x] Retornar erros claros por item quebrado.

### 6. Servico de publicacao

- [x] Criar draft.
- [x] Validar draft.
- [x] Publicar somente versao `validated`.
- [x] Arquivar versao publicada anterior na mesma transacao.
- [x] Implementar rollback para ultima versao arquivada valida.

### 7. Endpoints

- [x] Endpoints internos de versionamento.
- [x] `/modules` lendo somente versao publicada.
- [x] `/screens/{screen_id}` lendo somente versao publicada.
- [x] Erros `404` para tela nao publicada.
- [x] Erros `403` para usuario sem acesso ao cliente/tela.

### 8. Frontend minimo

- [x] Nao mexer no layout visual padrao.
- [x] Garantir que `configApi` continue aceitando o contrato vindo do backend.
- [x] Se necessario, criar adaptador fino entre config publicada e tipos atuais.
- [x] Manter fallback local apenas quando API estiver explicitamente desativada.

### 9. Testes

- [x] Backend: teste Cliente A recebe modulo/tela A.
- [x] Backend: teste Cliente B recebe modulo/tela B.
- [x] Backend: teste cross-client negado.
- [x] Backend: teste draft invalido nao publica.
- [x] Backend: teste publicar nova versao arquiva anterior.
- [x] Backend: teste rollback restaura versao anterior.
- [x] Frontend: `npm.cmd run build`.
- [x] Backend: `python -m pytest`.

### 10. Fechamento

- [x] Atualizar `plans/logs/FASE_3_EXECUCAO.md`.
- [x] Atualizar status da Fase 3 no plano global somente se tudo passar.
- [x] Executar `python summarize.py`.
- [x] Rodar postflight do phase validator.

### Criterios de aceite

- [x] Cliente A e Cliente B recebem telas diferentes sem alterar codigo React.
- [x] Uma nova versao pode ser criada, validada e publicada para um cliente.
- [x] Publicar nova versao arquiva a versao publicada anterior.
- [x] Rollback volta para uma versao anterior valida.
- [x] Configuracao invalida nao chega ao status `published`.
- [x] Frontend nao recebe schema, tabela ou SQL.
- [x] Testes backend passam.
- [x] Build frontend passa.
- [x] Mapas de contexto regenerados.

### Decisoes para implementacao

- Usar `app_core` como fonte da verdade para configuracao.
- Usar schemas tenant apenas para dados do cliente, nao para configuracao visual.
- Publicacao deve ser transacional.
- Snapshot publicado deve ser lido rapido e sem recomputar catalogo inteiro a cada request.
- Catalogo normalizado continua existindo para edicao/validacao.
- Snapshot JSON existe para runtime estavel e rollback simples.

### Pendencias conhecidas para antes de executar

- Confirmar se a Fase 3 deve usar a conexao Supabase direta como na Fase 2 ou aguardar MCP com permissao correta.
- Definir como identificar usuario interno nos endpoints `/internal` enquanto auth real ainda nao esta finalizada.
- Decidir se o fallback mock continua ativo em desenvolvimento ou se deve exigir `DATABASE_URL` para esta fase.
