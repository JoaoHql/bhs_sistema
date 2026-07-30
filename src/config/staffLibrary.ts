/**
 * Biblioteca mockada da equipe. Alterar `enabled` oculta o grupo/tela apenas
 * no ambiente da equipe; nao publica nem altera o manifesto de nenhum tenant.
 */
export const staffLibrary = {
  analises: { enabled: true, screens: ['analises-overview', 'analises-rfv', 'analises-region', 'analises-performance', 'analises-mapa'] },
  marketplaces: { enabled: true, screens: ['analises-shopee', 'analises-mercadolivre', 'analises-ifood'] },
  financeiro: { enabled: true, screens: ['financeiro-pagar', 'financeiro-receber', 'financeiro-conciliacao', 'financeiro-dre'] },
  ads: { enabled: true, screens: ['ads-meta', 'ads-google-analytics'] },
  agente: { enabled: true, screens: ['agente'] },
  simuladores: { enabled: true, screens: ['simuladores-combos'] },
  mensagens: { enabled: true, screens: ['mensagens-disparos-whatsapp'] },
  dados: { enabled: true, screens: ['workspace-dados', 'cadastros'] },
  configuracoes: { enabled: true, screens: ['configuracoes'] },
} as const;

export type StaffLibraryGroupId = keyof typeof staffLibrary;

export const isStaffLibraryGroupEnabled = (groupId: StaffLibraryGroupId) => staffLibrary[groupId].enabled;

export const isStaffLibraryScreenEnabled = (screenId: string) =>
  Object.values(staffLibrary).some(group => group.enabled && group.screens.includes(screenId as never));
