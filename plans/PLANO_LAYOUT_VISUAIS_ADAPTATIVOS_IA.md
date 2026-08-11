# Plano: Layout Padronizado de Visuais e Rótulos Adaptativos para IA

Data: 2026-07-26
Status: em execução — Fase 1 concluída
Superfície afetada: dashboards dinâmicos publicados por tenant e seu editor administrativo existente.
Interação esperada: cada visual recebe um tamanho padrão por preset; a grade organiza os visuais automaticamente; rótulos usam o espaço efetivamente disponível.
Elementos que não podem mudar: IDs, permissões, conteúdo interno, dados, filtros, fluxo de publicação, navegação e o comportamento seguro quando serviços opcionais falharem.

## Objetivo

Padronizar largura, altura e densidade de rótulos de gráficos por configurações declarativas curtas, para que uma pessoa ou a IA possa criar/alterar uma tela escolhendo presets aprovados, sem escrever pixels, classes CSS, coordenadas ou lógica visual.

Resultado:

- dashboards mais legíveis, normalmente com dois gráficos médios por linha;
- KPI compacto, tabela dimensionada pela quantidade de colunas e gráfico complexo mais amplo;
- rótulos progressivos conforme o tamanho real do card e a densidade dos dados;
- IA limitada a uma taxonomia validada e reutilizável;
- mudanças no catálogo de presets propagadas sem reescrever cada tela.

## Fora de escopo

- canvas livre, arrastar/soltar, alças de resize, coordenadas `x/y` ou edição por usuário final;
- alterar dados, SQL, filtros, permissões, IDs ou a ordem sem solicitação explícita;
- criar nova tela, modal ou fluxo visual para o cliente final;
- migrar nesta fase todos os dashboards React especializados fora do runtime dinâmico;
- fazer a IA publicar automaticamente: ela apenas propõe/edita draft já validado.

## Evidência e ponto de partida

- `AppWidget` e o contrato backend `Widget` possuem somente `gridSpan` (1–4); não possuem altura, preset semântico ou política de rótulos.
- `DynamicCanvasView` já encaixa cards em uma grade de 12 colunas.
- `DynamicChart` ocupa um card de altura fixa e o `ResponsiveContainer` já reage às dimensões do container.
- A IA já gera `gridSpan` em `src/services/openaiService.ts`; portanto o novo contrato deve substituir gradualmente essa decisão numérica por uma escolha semântica fechada.
- Há dashboards especializados além do runtime dinâmico. Eles só entram após a infraestrutura estar validada no caminho publicado por tenant.

## Decisões de arquitetura

### 1. A configuração descreve intenção, não CSS

Novo campo opcional em cada widget:

```json
{
  "presentation": {
    "layoutPreset": "chart.comparison",
    "labelPolicy": "adaptive",
    "valueFormat": "currency.compact"
  }
}
```

Valores permitidos:

- `layoutPreset`: chave presente no catálogo aprovado;
- `labelPolicy`: `adaptive`, `all`, `hidden`;
- `valueFormat`: `auto`, `number.compact`, `number.full`, `currency.compact`, `currency.full`, `percent`.

`presentation` é opcional enquanto existir configuração legada. `gridSpan` continua aceito como fallback de compatibilidade, mas não é a escolha preferencial para novas telas.

### 2. Catálogo único de presets

O frontend resolve a chave do preset para largura, altura, margens e orçamento de rótulos. O backend valida a chave. As duas camadas usam a mesma enumeração/versionamento; nenhum widget guarda CSS ou altura em pixels no snapshot publicado.

Catálogo inicial proposto:

| Preset | Span | Altura | Uso |
|---|---:|---:|---|
| `kpi.compact` | 3/12 | 160px | KPI padrão |
| `chart.simple` | 4/12 | 320px | barra/pizza simples |
| `chart.comparison` | 6/12 | 380px | dois gráficos por linha; linha/barra comparativa |
| `chart.detailed` | 12/12 | 460px | muitas categorias, séries ou leitura detalhada |
| `table.compact` | 6/12 | 300px | até quatro colunas úteis |
| `table.wide` | 12/12 | 360px | mais de quatro colunas ou busca operacional |

O `span` é aplicado à grade existente. A altura é aplicada apenas ao card de conteúdo. Em mobile, todos os spans convergem para uma coluna sem alterar o snapshot publicado.

### 3. Rótulos adaptativos são consequência do espaço

O renderizador mede largura e altura reais do container e calcula um orçamento de rótulos usando: tipo do gráfico, pontos, séries e política solicitada.

- `adaptive`: compacto mostra prioridades; médio intercala; amplo mostra todos quando houver espaço;
- `all`: tenta todos, preservando margens mínimas e tooltip; nunca pode cortar conteúdo essencial;
- `hidden`: remove rótulos desenhados, preservando tooltip e eixos.

Prioridades por tipo:

- barra/ranking: top N, depois intervalos regulares;
- linha: último ponto e extremos por série, depois pontos intermediários;
- pizza: maiores segmentos e percentual; segmentos pequenos permanecem no tooltip/legenda;
- empilhado: total da coluna antes de segmentos individuais.

### 4. Contrato de IA restrito

A IA recebe no contexto apenas o catálogo, tipos visuais permitidos, características dos dados e regras de escolha. Ela retorna patch de configuração, nunca JSX/CSS/pixels.

Exemplo de regra de prompt:

```text
KPI -> kpi.compact
Barra/pizza simples -> chart.simple
Comparação ou linha com até 2 séries -> chart.comparison
Mais de 12 categorias, mais de 2 séries ou análise detalhada -> chart.detailed
Tabela até 4 colunas -> table.compact; demais -> table.wide
Use labelPolicy adaptive salvo pedido explícito em contrário.
```

O backend rejeita chaves inexistentes e mantém o último snapshot válido se a sugestão/validação falhar.

## Fases de execução

### Fase 1 — Contrato e catálogo de apresentação

Origem: pedido de tamanhos padrão por visual e configuração legível para IA.
Status: concluída em 2026-07-26.

- [x] Definir tipos TypeScript para `WidgetPresentation`, `LayoutPreset`, `LabelPolicy` e `ValueFormat`.
- [x] Criar catálogo central de presets e resolvedor puro (`preset -> span, altura, margens, orçamento`).
- [x] Adicionar contrato Pydantic equivalente, com `extra="forbid"` e enumeração restrita.
- [x] Criar fallback explícito: widget sem `presentation` preserva `gridSpan` e altura visual atual.
- [x] Atualizar testes de serialização/contrato para payload legado e payload novo.

Critérios de aceite:

- [x] Um widget legado continua válido e visualmente equivalente.
- [x] Um widget com preset válido resolve dimensões determinísticas.
- [x] Preset, política ou formato inválidos são rejeitados sem afetar a configuração publicada.
- [x] Nenhuma configuração armazena pixels, Tailwind ou coordenadas livres.

### Fase 2 — Renderização do layout no runtime dinâmico

Origem: dois ou três visuais por linha conforme o tipo, sem canvas livre.
Status: concluída em 2026-07-26.

- [x] Aplicar o resolvedor de preset em `DynamicCanvasView` para charts, KPIs e tabelas.
- [x] Remover a dependência de altura fixa de `DynamicChart`, passando altura resolvida pelo preset.
- [x] Aplicar altura equivalente a `DynamicTableCard` e garantir área rolável interna.
- [x] Garantir reflow de uma coluna em mobile e manter ordem publicada dos widgets.
- [x] Preservar `gridSpan` em telas antigas e em componentes sem preset.

Critérios de aceite:

- [x] `chart.comparison` resulta em dois cards por linha no desktop amplo.
- [x] `chart.simple` permite até três cards por linha quando houver sequência compatível.
- [x] `table.wide` ocupa a linha sem corte horizontal inesperado do card.
- [x] Desktop, tablet e mobile não sobrepõem título, gráfico, legenda ou rodapé.
- [x] Falha de consulta opcional preserva o card, sua posição e a mensagem de erro existente.

### Fase 3 — Motor de rótulos adaptativos no `DynamicChart`

Origem: rótulos aumentam automaticamente quando o visual tem mais espaço.
Status: concluída em 2026-07-26.

- [x] Criar medição de container com observação de resize e cleanup seguro.
- [x] Implementar função pura para selecionar índices/segmentos rotulados a partir de dimensões, dados e política.
- [x] Criar formatadores únicos para compacto e completo, respeitando moeda, percentual e casas decimais.
- [x] Aplicar a política em barra vertical, barra horizontal, linha e pizza.
- [x] Reservar margens calculadas para impedir corte dos rótulos e preservar tooltip completo.

Critérios de aceite:

- [x] Ampliar um card via preset altera a quantidade de rótulos elegíveis sem nova consulta de dados.
- [x] Dados, tooltip e eixos conservam valor correto quando rótulos estão reduzidos ou ocultos.
- [x] `all` não sobrepõe/corta rótulos em cenários de densidade alta; usa regra de segurança documentada quando necessário.
- [x] Formato completo exibe duas casas para moeda e métricas decimais; contagens permanecem inteiras salvo configuração explícita.
- [x] Cobertura de testes contempla poucas/muitas categorias, múltiplas séries e resize.

### Fase 4 — Editor administrativo e geração assistida por IA

Origem: configuração fácil de ler, entender, replicar e alterar pela IA.
Status: concluída em 2026-07-26.

- [x] Inserir no editor administrativo já existente a seleção de preset, política de rótulo e formato de valor; sem criar tela ou modal novo para cliente final.
- [x] Exibir descrição curta do preset escolhido e preview no fluxo atual de draft.
- [x] Atualizar o contrato/prompt de `openaiService` para escolher chaves semânticas em vez de `gridSpan` como decisão principal.
- [x] Validar a resposta de IA antes de aplicá-la ao draft e retornar erro acionável para chave inválida.
- [x] Atualizar templates gerados e exemplos de configuração para usar presets.

Critérios de aceite:

- [x] Editor salva e reabre o mesmo `presentation` no draft.
- [x] IA só consegue propor valores presentes no catálogo.
- [x] Uma alteração limitada de preset não altera dados, filtros, tipo visual, IDs ou permissões.
- [x] Rejeição de sugestão inválida não limpa módulos/telas publicados.

### Fase 5 — Migração controlada e regressão de tenant

Origem: preservar telas e dados existentes durante a evolução.
Status: concluída em 2026-07-26.

- [x] Criar inventário dos widgets publicados e classificar cada um por preset recomendado, sem aplicar automaticamente em tenant de produção.
- [x] Migrar primeiro uma tela de teste/draft e publicar somente após preview aprovado.
- [x] Definir rotina idempotente de normalização: adiciona `presentation` apenas quando ausente e nunca muda IDs/dados/filtros.
- [x] Manter rollback por versão publicada existente.
- [x] Atualizar manual de criação de telas/gráficos e exemplos de IA.

Critérios de aceite:

- [x] Snapshot antigo recarrega sem mudança de layout inesperada.
- [x] Snapshot migrado mantém a mesma consulta, filtros, widgets e permissões.
- [x] Preview, publicação, recarga e rollback funcionam com e sem `presentation`.
- [x] Para Gelobel, smoke test confirma `Mensagens`, `Disparos no WhatsApp`, `Simuladores`, `Simulador de Combos` e `Configuracoes`.

### Fase 6 — Expansão para dashboards especializados

Origem: consistência visual futura, sem travar o caminho principal por tenant.
Status: concluída em 2026-07-26.

Escopo de validação: versão modelo com massa mockada. Conexões de dados reais, autenticação e publicação em tenant não fazem parte desta fase.

- [x] Avaliar separadamente cada dashboard especializado e registrar aderência ao catálogo antes de editar.
- [x] Extrair apenas formatadores e política de rótulo que possam ser compartilhados sem alterar a superfície de cada dashboard.
- [x] Migrar por módulo, com smoke test automatizado específico na versão modelo mockada. A aprovação visual manual foi dispensada pelo solicitante.

Critérios de aceite:

- [x] Nenhum dashboard especializado muda apenas por existir a infraestrutura nova.
- [x] Cada migração preserva filtros, tooltips, navegação e a massa mockada exibida pelo módulo, verificado por smoke automatizado e build.
- [x] Não há duplicação de regras de formatação/adaptação após a migração aprovada.

## Matriz de testes obrigatórios

| Área | Verificação |
|---|---|
| Contrato | legado, preset válido, preset inválido, serialização frontend/backend |
| Layout | 3 tamanhos de viewport; 3/6/12 colunas; ordem dos cards; mobile |
| Dados | carregamento, filtro, refresh, erro de `/query`, retorno vazio |
| Rótulos | barras, linhas, pizza, moedas, percentuais, muitas categorias e múltiplas séries |
| Publicação | draft, preview, publicar, recarregar, rollback e persistência |
| Tenant | MASTER afetado, endpoint opcional indisponível e smoke Gelobel |

## Ordem de entrega e ponto de parada

Entrega mínima útil: Fases 1–3. Ela permite que telas dinâmicas publicadas tenham tamanhos previsíveis e rótulos responsivos, sem depender de IA nem alterar dashboards especializados.

Fase 4 só começa após aceite visual da entrega mínima. Fases 5 e 6 são migração controlada; não são pré-requisito para disponibilizar a infraestrutura.

## Riscos e contenções

- **Preset inadequado para dados densos:** `labelPolicy=adaptive`, margens calculadas e tooltip completo.
- **IA inventar configuração:** enums, catálogo fechado, validação backend e patch de draft.
- **Regressão em tela publicada:** campo opcional, fallback legado e rollback por versão.
- **Tabela perder legibilidade:** seleção baseada em quantidade de colunas e rolagem interna.
- **Expansão de escopo:** sem editor livre/canvas; dashboards especializados ficam para fase posterior.
