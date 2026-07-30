import type { WhatsAppDispatchesTemplateData } from '../types';

export const buildMockWhatsAppDispatchesData = (): WhatsAppDispatchesTemplateData => ({
  mode: 'mock',
  metrics: [
    { key: 'vendas_hoje', label: 'Vendas do dia', description: 'Total vendido hoje, atualizado antes do envio.', category: 'Diario', value: 'R$ 42.860,00' },
    { key: 'devolucoes_hoje', label: 'Devoluções do dia', description: 'Valor devolvido no dia atual.', category: 'Diario', value: 'R$ 1.248,00' },
    { key: 'variacao_diaria', label: 'Variação vs. ontem', description: 'Comparação das vendas de hoje com ontem.', category: 'Comparacao', value: '+12,4%' },
    { key: 'vendas_mtd', label: 'Vendas no mês (MTD)', description: 'Acumulado do mês até agora.', category: 'Mensal', value: 'R$ 684.320,00' },
    { key: 'variacao_mtd', label: 'Variação mensal', description: 'MTD versus mesmo período do mês anterior.', category: 'Comparacao', value: '+8,7%' },
    { key: 'pedidos_hoje', label: 'Pedidos do dia', description: 'Quantidade de pedidos faturados hoje.', category: 'Diario', value: '186 pedidos' },
    { key: 'vendas_ano', label: 'Vendas no ano', description: 'Acumulado anual até agora.', category: 'Anual', value: 'R$ 7.840.000,00' },
  ],
  initialDispatches: [
    { id: 'daily-sales', name: 'Resumo diário de vendas', status: 'active', recipients: ['Bruno', 'Diretoria'], schedule: ['08:00', '17:30'], nextRun: 'Hoje, 17:30', lastRun: 'Hoje, 08:00', template: 'Bom dia!\n\n📊 *Resumo de vendas*\n• Vendas: {{vendas_hoje}}\n• Devoluções: {{devolucoes_hoje}}\n• Comparado a ontem: {{variacao_diaria}}\n\nForam faturados {{pedidos_hoje}}.', filters: ['Todas as filiais', 'Todos os canais'] },
    { id: 'monthly-board', name: 'Acompanhamento mensal', status: 'active', recipients: ['Conselho'], schedule: ['09:00'], nextRun: 'Amanhã, 09:00', lastRun: 'Hoje, 09:00', template: '📈 *Acompanhamento mensal*\n\nVendas acumuladas: {{vendas_mtd}}\nEvolução no período: {{variacao_mtd}}\n\nDados atualizados neste momento.', filters: ['Filial matriz'] },
    { id: 'operations', name: 'Alerta operacional', status: 'paused', recipients: ['Operações'], schedule: ['12:00'], nextRun: 'Pausado', lastRun: 'Sexta, 12:00', template: '⚠️ *Operação do dia*\nVendas: {{vendas_hoje}}\nDevoluções: {{devolucoes_hoje}}', filters: ['Canal atacado'] },
  ],
  initialLogs: [
    { id: 'log-1', dispatchId: 'daily-sales', recipient: 'Bruno e Diretoria', sentAt: 'Hoje, 08:00', status: 'sent', summary: 'Resumo diário de vendas' },
    { id: 'log-2', dispatchId: 'daily-sales', recipient: 'Bruno e Diretoria', sentAt: 'Ontem, 17:30', status: 'sent', summary: 'Resumo diário de vendas' },
    { id: 'log-3', dispatchId: 'monthly-board', recipient: 'Conselho', sentAt: 'Hoje, 09:00', status: 'sent', summary: 'Acompanhamento mensal' },
  ],
  availableRecipients: [
    { id: 'mock-bruno', name: 'Bruno (MASTER)', phone: '+5571999999999', isMaster: true },
    { id: 'mock-diretoria', name: 'Diretoria', phone: '+5571888888888', isMaster: false },
    { id: 'mock-operacoes', name: 'Operações', phone: null, isMaster: false },
  ],
});
