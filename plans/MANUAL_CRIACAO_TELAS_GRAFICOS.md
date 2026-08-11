# Manual de Criacao de Telas e Graficos

## Fluxo Padrao

1. Escolher cliente.
2. Confirmar fonte de dados existente com `published-report` e `validate-tenant`.
3. Criar ou ajustar draft de configuracao.
4. Usar somente `dataSourceId` catalogado.
5. Usar campos presentes em `allowed_fields`.
6. Usar filtros presentes em `allowed_filters`.
7. Validar.
8. Publicar.
9. Rodar smoke test.

## Tela

Cada tela deve ter:

- `id` estavel.
- `moduleId` existente.
- `label` claro.
- `layout` como `dashboard` ou `canvas`.
- `filters` padronizados.
- `components` com widgets validos.

## Chart

Obrigatorio:

- `type: "chart"`.
- `dataSourceId`.
- `chartConfig.dimensions`.
- `chartConfig.metrics`.
- Campo de dimensao e metrica dentro de `allowed_fields`.

## KPI

Obrigatorio:

- `type: "kpi_card"`.
- `dataSourceId`.
- `kpiConfig.field`.
- `kpiConfig.aggregation`.

## Tabela

Obrigatorio:

- `type: "table"`.
- `dataSourceId`.
- `tableConfig.title`.
- Campos saem da allowlist da fonte.

## QA Visual Minimo

- Tela carrega sem erro.
- Filtros nao quebram layout.
- Chart renderiza com dados.
- KPI exibe valor.
- Tabela exibe linhas.
- Mobile nao sobrepoe textos.
- Cliente BHS e ACME continuam funcionando.

## Apresentacao Padrao e IA

Cada novo widget deve declarar `presentation`; a IA deve alterar apenas esses campos, sem coordenadas, pixels ou classes visuais:

```json
"presentation": {
  "layoutPreset": "chart.simple",
  "labelPolicy": "adaptive",
  "valueFormat": "currency.compact"
}
```

- Presets: `kpi.compact`, `chart.simple`, `chart.comparison`, `chart.detailed`, `table.compact`, `table.wide`.
- Rotulos: `adaptive`, `all`, `hidden`. `all` continua sujeito ao limite de seguranca contra sobreposicao.
- Formatos: `auto`, `number.compact`, `number.full`, `currency.compact`, `currency.full`, `percent`.
- Snapshot legado sem `presentation` preserva `gridSpan` e a altura anterior. Para evoluir, crie um draft normalizado, valide o preview e publique somente apos aprovacao.
- O inventario e somente-leitura; a normalizacao e idempotente e nunca altera IDs, fontes, filtros, permissoes ou dados.

## Novo Tipo Visual

So aceitar quando:

- Tem contrato Pydantic.
- Tem renderizador frontend.
- Tem validacao de configuracao.
- Tem smoke test.
- Nao exige SQL livre.
