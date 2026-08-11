# Avaliação dos dashboards especializados

Validação: versão modelo mockada. Aprovação visual manual dispensada pelo solicitante; cobertura feita por build e smoke automatizado de código.

Data: 2026-07-26. Escopo: aderência ao catálogo de apresentação sem alterar navegação, filtros, dados ou tooltips.

| Módulo | Aderência | Decisão nesta fase |
|---|---|---|
| iFood | Grid e alturas próprios; rótulos já explícitos. | Migrar somente formatação compartilhada. |
| Mercado Livre | Grid e gráficos compostos próprios; rótulos já explícitos. | Migrar somente formatação compartilhada. |
| Shopee | Grid e alturas próprios; rótulos já explícitos. | Migrar somente formatação compartilhada. |
| RFV | Sem padrão de rótulos compatível comum. | Não migrar. |
| Região | Geometria e referências próprias. | Não migrar. |
| Performance | Metas e radial próprios. | Não migrar. |
| Mapa | Não é dashboard de cards Recharts equivalente. | Não migrar. |
| Overview | Dashboard de contexto próprio. | Não migrar. |

Os três módulos migrados usam `formatSpecializedCurrency`, `formatSpecializedNumber` e, quando aplicável, `formatSpecializedCompactCurrency` de `src/utils/chartLabels.ts`. A política de rótulos existente e os tooltips não são alterados.
