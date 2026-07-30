# Overview Template

Origem:
- `src/features/analises/components/OverviewTab.tsx`

Referencia operacional:
- `operacional/referencias_mockadas/analises/visao-geral.md`

Objetivo:
- preservar a tela "Visao Geral" mockada como template reutilizavel para clientes.

## Arquivos

- `OverviewTemplate.tsx`: visual e interacoes da tela.
- `types.ts`: contrato normalizado da tela.
- `adapters/mockOverviewAdapter.ts`: converte `Customer[]` e `Meta[]` mockados.
- `index.ts`: exports publicos.

## Contrato Visual

O template espera:

- KPIs executivos;
- serie temporal de faturamento e meta opcional;
- serie de categoria/linha com realizado e meta opcional;
- serie de segmento para donut;
- top clientes;
- estado de filtros e callbacks de interacao.

## Adaptacoes Permitidas

Sem perder visual:

- Regiao pode virar filial, canal, loja ou unidade.
- Categoria pode virar canal, produto, servico ou filial.
- Meta pode ser omitida quando o tenant nao tiver meta.
- Labels podem mudar conforme a dimensao usada.

Nao permitido:

- reimplementar os graficos fora do template;
- trocar layout sem necessidade explicita;
- remover tooltips/interacoes sem registrar motivo.

