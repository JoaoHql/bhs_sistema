import type { AppModule } from '../types';

// Reference Catalog of all 5 main modules and 18 screens currently in the system
export const SYSTEM_REFERENCE_CATALOG = {
  totalModules: 6,
  totalScreens: 17,
  modules: [
    {
      id: 'mod-analises',
      label: 'Módulo de Análises',
      screens: ['Overview', 'Faturamento', 'Rentabilidade', 'Vendas']
    },
    {
      id: 'mod-marketplaces',
      label: 'Marketplaces',
      screens: ['Shopee', 'Mercado Livre', 'iFood']
    },
    {
      id: 'mod-financeiro',
      label: 'Financeiro',
      screens: ['DRE', 'EBITDA', 'Fluxo de Caixa']
    },
    {
      id: 'mod-ads',
      label: 'Mídia e Ads',
      screens: ['Meta Ads', 'Google Ads']
    },
    {
      id: 'mod-simuladores',
      label: 'Simuladores',
      screens: ['Margem EBITDA', 'Cenários RFV']
    },
    {
      id: 'mod-base-dados',
      label: 'Base de Dados',
      screens: ['Workspace de Dados', 'Registros Gerais']
    }
  ]
};

// Preset Layout Generators for Ask AI Agent
export const generateDenseLayout = (workspaceId: string, titleName: string, isEnriched?: boolean): AppModule => {
  const targetLabel = isEnriched ? `${titleName} (Enriquecida)` : `${titleName} (Densa)`;
  return {
    id: `mod-dense-${Date.now()}`,
    label: targetLabel,
    icon: 'TrendingUp',
    screens: [
      {
        id: `scr-dense-${Date.now()}`,
        label: `Dashboard Consolidado`,
        layout: 'dashboard', // Dense layout
        components: [
          // Row 1: 4 KPIs with comparative metrics
          {
            type: 'kpi_card',
            presentation: { layoutPreset: 'kpi.compact', labelPolicy: 'adaptive', valueFormat: 'currency.compact' },
            title: 'Faturamento Bruto',
            kpiConfig: {
              workspaceId,
              field: workspaceId === 'ws-2' ? 'valor_pago' : 'valor_liquido',
              aggregation: 'sum',
              label: 'Faturamento Bruto',
              format: 'currency'
            }
          },
          {
            type: 'kpi_card',
            presentation: { layoutPreset: 'kpi.compact', labelPolicy: 'adaptive', valueFormat: 'number.full' },
            title: 'Volume Operações',
            kpiConfig: {
              workspaceId,
              field: workspaceId === 'ws-2' ? 'pedido_id' : 'id',
              aggregation: 'count',
              label: 'Volume Operações',
              format: 'number'
            }
          },
          {
            type: 'kpi_card',
            presentation: { layoutPreset: 'kpi.compact', labelPolicy: 'adaptive', valueFormat: 'currency.compact' },
            title: 'Custos Consolidados',
            kpiConfig: {
              workspaceId,
              field: workspaceId === 'ws-2' ? 'frete' : 'custo_operacional',
              aggregation: 'sum',
              label: 'Custos Consolidados',
              format: 'currency'
            }
          },
          {
            type: 'kpi_card',
            presentation: { layoutPreset: 'kpi.compact', labelPolicy: 'adaptive', valueFormat: 'currency.full' },
            title: 'Ticket Médio',
            kpiConfig: {
              workspaceId,
              field: workspaceId === 'ws-2' ? 'valor_pago' : 'valor_liquido',
              aggregation: 'avg',
              label: 'Ticket Médio',
              format: 'currency'
            }
          },
          // Row 2: 2 Side-by-side charts
          {
            type: 'chart',
            presentation: { layoutPreset: 'chart.comparison', labelPolicy: 'adaptive', valueFormat: 'currency.compact' },
            isEnriched,
            enrichmentOptions: isEnriched ? { goalValue: 1500000 } : undefined,
            chartConfig: {
              id: `chart-dense-line-${Date.now()}`,
              workspaceId,
              type: 'line',
              title: 'Evolução Temporal',
              description: 'Demonstrativo temporal acumulado das transações integradas.',
              dimensions: [{ field: workspaceId === 'ws-4' ? 'mes_ano' : 'filial', label: 'Referência' }],
              metrics: [{
                field: workspaceId === 'ws-2' ? 'valor_pago' : 'valor_liquido',
                label: 'Receita Líquida',
                aggregation: 'sum',
                format: 'currency'
              }],
              options: { color: '#8b5cf6' } // purple line
            }
          },
          {
            type: 'chart',
            presentation: { layoutPreset: 'chart.comparison', labelPolicy: 'adaptive', valueFormat: 'currency.compact' },
            isEnriched,
            enrichmentOptions: isEnriched ? { goalValue: 1800000 } : undefined,
            chartConfig: {
              id: `chart-dense-bar-${Date.now()}`,
              workspaceId,
              type: 'bar',
              title: 'Distribuição Comparativa',
              description: 'Comparativo nominal por segmento ou categoria.',
              dimensions: [{ field: workspaceId === 'ws-2' ? 'filial' : 'categoria_venda', label: 'Eixo' }],
              metrics: [{
                field: workspaceId === 'ws-2' ? 'valor_pago' : 'valor_liquido',
                label: 'Volume Faturado',
                aggregation: 'sum',
                format: 'currency'
              }],
              options: { color: '#3b82f6' } // blue bar
            }
          },
          // Row 3: Data Table (Enriched or Simple)
          {
            type: 'table',
            presentation: { layoutPreset: 'table.wide', labelPolicy: 'hidden', valueFormat: 'auto' },
            title: 'Registros Integrados da Fonte',
            isEnriched,
            enrichmentOptions: isEnriched ? {
              showSearch: true,
              showSort: true,
              cellProgressBarField: workspaceId === 'ws-2' ? 'valor_pago' : 'valor_liquido'
            } : undefined,
            tableConfig: {
              workspaceId,
              title: 'Registros Integrados'
            }
          }
        ]
      }
    ]
  };
};

export const generateFocusedLayout = (workspaceId: string, titleName: string, isEnriched?: boolean): AppModule => {
  const targetLabel = isEnriched ? `${titleName} (Enriquecida)` : `${titleName} (Focada)`;
  return {
    id: `mod-focused-${Date.now()}`,
    label: targetLabel,
    icon: 'Globe',
    screens: [
      {
        id: `scr-focused-${Date.now()}`,
        label: `Dashboard Focado`,
        layout: 'canvas', // Focused layout
        components: [
          // Row 1: 2 large double-width KPIs
          {
            type: 'kpi_card',
            presentation: { layoutPreset: 'kpi.compact', labelPolicy: 'adaptive', valueFormat: 'currency.compact' },
            title: 'Faturamento Focado',
            kpiConfig: {
              workspaceId,
              field: workspaceId === 'ws-2' ? 'valor_pago' : 'valor_liquido',
              aggregation: 'sum',
              label: 'Faturamento Total',
              format: 'currency'
            }
          },
          {
            type: 'kpi_card',
            presentation: { layoutPreset: 'kpi.compact', labelPolicy: 'adaptive', valueFormat: 'number.full' },
            title: 'Operações Consolidadas',
            kpiConfig: {
              workspaceId,
              field: workspaceId === 'ws-2' ? 'pedido_id' : 'id',
              aggregation: 'count',
              label: 'Total Pedidos',
              format: 'number'
            }
          },
          // Row 2: 1 Large full-width chart (Line)
          {
            type: 'chart',
            presentation: { layoutPreset: 'chart.detailed', labelPolicy: 'adaptive', valueFormat: 'currency.full' },
            isEnriched,
            enrichmentOptions: isEnriched ? { goalValue: 2000000 } : undefined,
            chartConfig: {
              id: `chart-focused-large-${Date.now()}`,
              workspaceId,
              type: 'line',
              title: 'Análise de Desempenho Focada',
              description: 'Distribuição espacial e temporal de alta resolução de dados.',
              dimensions: [{ field: workspaceId === 'ws-2' ? 'filial' : 'mes_ano', label: 'Eixo Principal' }],
              metrics: [{
                field: workspaceId === 'ws-2' ? 'valor_pago' : 'valor_liquido',
                label: 'Receita Focada',
                aggregation: 'sum',
                format: 'currency'
              }],
              options: { color: '#10b981' } // green line
            }
          }
        ]
      }
    ]
  };
};
