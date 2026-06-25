import type { AdsDashboardSnapshot, DataMode } from '../types';

const ADS_API_URL = import.meta.env.VITE_ADS_API_URL;

const mockAdsSnapshot: AdsDashboardSnapshot = {
  lastUpdated: '25/06/2026 09:40',
  meta: {
    platform: 'meta',
    title: 'Meta Ads',
    subtitle: 'Campanhas, criativos, funil e eficiencia por investimento.',
    kpis: [
      { id: 'spend', label: 'Investimento', value: 'R$ 84,2k', delta: '+12,4%', tone: 'blue' },
      { id: 'impressions', label: 'Impressoes', value: '3,8M', delta: '+18,9%', tone: 'slate' },
      { id: 'clicks', label: 'Cliques', value: '92,4k', delta: '+9,1%', tone: 'emerald' },
      { id: 'ctr', label: 'CTR', value: '2,43%', delta: '+0,3 pp', tone: 'amber' },
      { id: 'cpl', label: 'CPL', value: 'R$ 18,70', delta: '-7,6%', tone: 'rose' }
    ],
    timeline: [
      { label: 'Sem 1', investimento: 18200, receita: 91200, leads: 820, cpl: 22.2 },
      { label: 'Sem 2', investimento: 20600, receita: 118400, leads: 1110, cpl: 18.6 },
      { label: 'Sem 3', investimento: 21800, receita: 124900, leads: 1190, cpl: 18.3 },
      { label: 'Sem 4', investimento: 23600, receita: 139700, leads: 1380, cpl: 17.1 }
    ],
    summaryCards: [
      { title: 'Prospeccao', spend: 31200, revenue: 118500, conversions: 1020, roas: 3.8 },
      { title: 'Remarketing', spend: 18400, revenue: 126600, conversions: 740, roas: 6.9 },
      { title: 'Conversao', spend: 34600, revenue: 229100, conversions: 1740, roas: 6.6 }
    ],
    breakdown: [
      { name: 'Instagram', value: 42, color: '#2563eb' },
      { name: 'Facebook', value: 34, color: '#0f766e' },
      { name: 'Audience', value: 14, color: '#f59e0b' },
      { name: 'Messenger', value: 10, color: '#ef4444' }
    ],
    ranking: [
      { name: 'Lead form - oferta junho', value: 61200, secondary: 'ROAS 7,2' },
      { name: 'Catalogo dinamico', value: 48600, secondary: 'ROAS 6,5' },
      { name: 'Video prova social', value: 39200, secondary: 'CTR 3,1%' },
      { name: 'Lookalike compradores', value: 32800, secondary: 'CPL R$ 16,40' }
    ],
    channelPerformance: [
      { name: 'Criativo A', value: 86, secondary: '1.240 leads' },
      { name: 'Criativo B', value: 74, secondary: '980 leads' },
      { name: 'Criativo C', value: 61, secondary: '730 leads' }
    ]
  },
  googleAnalytics: {
    platform: 'google-analytics',
    title: 'Google Analytics',
    subtitle: 'Aquisicao, comportamento e conversao por origem de trafego.',
    kpis: [
      { id: 'sessions', label: 'Sessoes', value: '412k', delta: '+15,2%', tone: 'blue' },
      { id: 'users', label: 'Usuarios', value: '286k', delta: '+11,8%', tone: 'emerald' },
      { id: 'engagement', label: 'Engajamento', value: '61,4%', delta: '+4,2 pp', tone: 'amber' },
      { id: 'conversions', label: 'Conversoes', value: '12.840', delta: '+19,6%', tone: 'slate' },
      { id: 'bounce', label: 'Rejeicao', value: '28,7%', delta: '-3,1 pp', tone: 'rose' }
    ],
    timeline: [
      { label: 'Sem 1', sessoes: 88400, usuarios: 62100, conversoes: 2480, engajamento: 57.8 },
      { label: 'Sem 2', sessoes: 96700, usuarios: 68100, conversoes: 3010, engajamento: 60.2 },
      { label: 'Sem 3', sessoes: 108900, usuarios: 74400, conversoes: 3420, engajamento: 62.5 },
      { label: 'Sem 4', sessoes: 118000, usuarios: 81200, conversoes: 3930, engajamento: 64.1 }
    ],
    summaryCards: [
      { title: 'Organic Search', sessions: 142000, conversions: 4020, engagementRate: 66.8 },
      { title: 'Paid Social', sessions: 118000, conversions: 3840, engagementRate: 61.2 },
      { title: 'Direct', sessions: 82000, conversions: 2910, engagementRate: 58.9 }
    ],
    breakdown: [
      { name: 'Organic', value: 35, color: '#0f766e' },
      { name: 'Paid Social', value: 29, color: '#2563eb' },
      { name: 'Direct', value: 20, color: '#f59e0b' },
      { name: 'Referral', value: 16, color: '#ef4444' }
    ],
    ranking: [
      { name: '/campanha/oferta-junho', value: 48200, secondary: 'CVR 4,8%' },
      { name: '/produtos/linha-premium', value: 36400, secondary: 'CVR 3,9%' },
      { name: '/blog/guia-compra', value: 29100, secondary: 'Eng. 71%' },
      { name: '/checkout', value: 22800, secondary: 'Abandono 24%' }
    ],
    channelPerformance: [
      { name: 'Mobile', value: 68, secondary: '280k sessoes' },
      { name: 'Desktop', value: 24, secondary: '99k sessoes' },
      { name: 'Tablet', value: 8, secondary: '33k sessoes' }
    ]
  }
};

const normalizeAdsSnapshot = (payload: Partial<AdsDashboardSnapshot>): AdsDashboardSnapshot => ({
  ...mockAdsSnapshot,
  ...payload,
  meta: { ...mockAdsSnapshot.meta, ...payload.meta },
  googleAnalytics: { ...mockAdsSnapshot.googleAnalytics, ...payload.googleAnalytics },
  lastUpdated: payload.lastUpdated ?? mockAdsSnapshot.lastUpdated
});

export const loadAdsData = async (mode: DataMode): Promise<AdsDashboardSnapshot> => {
  if (mode === 'mock' || !ADS_API_URL) {
    return mockAdsSnapshot;
  }

  try {
    const response = await fetch(ADS_API_URL);
    if (!response.ok) {
      throw new Error(`Ads API ${response.status}`);
    }

    const payload = await response.json() as Partial<AdsDashboardSnapshot>;
    return normalizeAdsSnapshot(payload);
  } catch {
    return mockAdsSnapshot;
  }
};
