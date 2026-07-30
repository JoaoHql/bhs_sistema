# Template: Projeção de Vendas

Origem visual: `Gestão (BI) / Projeção de Vendas`.

Contrato: linhas diárias normalizadas, cenários de quantidade/ticket/meta e callback de alteração.

Adapters: `mockSalesProjectionAdapter.ts` preserva o contrato sem tenant; `gelobelSalesProjectionAdapter.ts` adapta a resposta da API Gelobel.

O template não consulta API nem conhece tabelas físicas. Mês e Empresa são filtros globais; os três cenários são controles internos.
