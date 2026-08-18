import React, { useEffect, useRef, useState } from 'react';
import { useDashboard } from '../store/dashboardStore';
import { 
  Database, 
  Settings, 
  ChevronDown, 
  ChevronRight, 
  Eye,
  Megaphone,
  MessageCircle,
  Sliders,
  Bot,
  ShoppingBag,
  Folder,
  TrendingUp,
  Globe,
  FileText,
  GripVertical,
  CircleUserRound,
  LogOut,
  Pencil,
  Check
} from 'lucide-react';
import { configApi, isConfigApiEnabled } from '../services/configApi';
import { isStaffLibraryScreenEnabled } from '../config/staffLibrary';
import { clearTenantDataCache } from '../services/tenantDataCache';
import { clearSession } from '../services/authToken';

interface SidebarProps {
  currentTab: string;
  setCurrentTab: (tab: string) => void;
  collapsed: boolean;
  setCollapsed: (collapsed: boolean) => void;
  onOpenAccount: () => void;
  onLogout: () => void;
}

export const Sidebar: React.FC<SidebarProps> = ({
  currentTab,
  setCurrentTab,
  collapsed,
  setCollapsed,
  onOpenAccount,
  onLogout,
}) => {
  const { currentUser, userModules, userMenuOrder, setUserMenuOrder, showToast } = useDashboard();
  const isStaff = !!currentUser?.is_staff;
  const isTenantMaster = !isStaff && !!currentUser?.roles.includes('admin');
  const canReorder = !!currentUser;
  const visibleUserModules = userModules
    .map((module) => ({ ...module, screens: module.screens.filter((screen) => screen.id !== 'configuracoes') }))
    .filter((module) => module.screens.length > 0);
  const availableTenantIds = [...visibleUserModules.map((module) => module.id), 'configuracoes'];
  
  const preferredTopModules = ['gestao-bi', 'analises', 'simuladores', 'mensagens'];
  const unorderedTenantIds = availableTenantIds.filter((id) => !userMenuOrder.includes(id));
  unorderedTenantIds.sort((a, b) => {
    const idxA = preferredTopModules.indexOf(a);
    const idxB = preferredTopModules.indexOf(b);
    if (idxA !== -1 && idxB !== -1) return idxA - idxB;
    if (idxA !== -1) return -1;
    if (idxB !== -1) return 1;
    return 0;
  });

  const normalizedUserOrder = [
    ...userMenuOrder.filter((id) => availableTenantIds.includes(id)),
    ...unorderedTenantIds,
  ];
  const menuPosition = (id: string) => {
    const index = normalizedUserOrder.indexOf(id);
    return index < 0 ? normalizedUserOrder.length + 1 : index + 1;
  };
  const [openSections, setOpenSections] = useState<Record<string, boolean>>({
    'gestao-bi': true,
    analises: true,
    marketplaces: true,
    financeiro: true,
    ads: true,
    cadastros: true,
    configuracoes: true,
    simuladores: true,
    mensagens: true
  });
  const [draggingModuleId, setDraggingModuleId] = useState<string | null>(null);
  const [editMode, setEditMode] = useState(false);
  const [accountMenuOpen, setAccountMenuOpen] = useState(false);
  const [dropIndicator, setDropIndicator] = useState<{ id: string; edge: 'before' | 'after' } | null>(null);
  const pointerDrag = useRef<{ id: string; startY: number; active: boolean } | null>(null);
  const currentDropIndicator = useRef<{ id: string; edge: 'before' | 'after' } | null>(null);
  const suppressModuleClick = useRef(false);

  const localOrderKey = currentUser ? `bhs_menu_order_${currentUser.client_slug ?? currentUser.id}` : null;

  const dropModule = async (moduleId: string, targetId: string, edge: 'before' | 'after') => {
    if (moduleId === targetId) return;

    const previousOrder = normalizedUserOrder;
    const nextOrder = previousOrder.filter((id) => id !== moduleId);
    const targetIndex = nextOrder.indexOf(targetId);
    nextOrder.splice(targetIndex + (edge === 'after' ? 1 : 0), 0, moduleId);

    setUserMenuOrder(nextOrder);
    setDraggingModuleId(null);
    setDropIndicator(null);
    currentDropIndicator.current = null;

    // Persistência local mantém a preferência disponível quando a API estiver indisponível.
    if (localOrderKey) {
      try { localStorage.setItem(localOrderKey, JSON.stringify(nextOrder)); } catch {}
    }

    if (!isConfigApiEnabled()) return;
    try {
      await configApi.updateUserMenuOrder(nextOrder);
    } catch {
      showToast('Ordem salva neste navegador; a sincronização da preferência pessoal falhou.');
    }
  };

  // Em API real, o store já recupera a preferência do usuário e usa localStorage só como fallback.
  useEffect(() => {
    if (!localOrderKey || isConfigApiEnabled()) return;
    try {
      const saved = localStorage.getItem(localOrderKey);
      if (saved) {
        const parsed: string[] = JSON.parse(saved);
        if (Array.isArray(parsed) && parsed.length > 0) {
          setUserMenuOrder(parsed);
        }
      }
    } catch {}
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [localOrderKey]);

  const movePointerDrag = (event: React.PointerEvent<HTMLButtonElement>) => {
    const drag = pointerDrag.current;
    if (!drag || (!drag.active && Math.abs(event.clientY - drag.startY) < 5)) return;
    if (!drag.active) {
      drag.active = true;
      setDraggingModuleId(drag.id);
    }
    event.preventDefault();
    const target = document.elementFromPoint(event.clientX, event.clientY)?.closest<HTMLElement>('[id^="sidebar-item-"]');
    const targetId = target?.id.replace('sidebar-item-', '');
    if (!target || !targetId || targetId === drag.id) return;
    const bounds = target.getBoundingClientRect();
    const indicator = { id: targetId, edge: event.clientY < bounds.top + bounds.height / 2 ? 'before' as const : 'after' as const };
    currentDropIndicator.current = indicator;
    setDropIndicator(indicator);
  };

  const finishPointerDrag = (event: React.PointerEvent<HTMLButtonElement>) => {
    const drag = pointerDrag.current;
    if (!drag) return;
    if (event.currentTarget.hasPointerCapture(event.pointerId)) event.currentTarget.releasePointerCapture(event.pointerId);
    pointerDrag.current = null;
    if (drag.active) {
      suppressModuleClick.current = true;
      const indicator = currentDropIndicator.current;
      if (indicator) void dropModule(drag.id, indicator.id, indicator.edge);
      else setDraggingModuleId(null);
      setDropIndicator(null);
      currentDropIndicator.current = null;
      window.setTimeout(() => { suppressModuleClick.current = false; }, 0);
    }
  };

  const dragClasses = (id: string) => {
    const indicator = dropIndicator?.id === id
      ? dropIndicator.edge === 'before'
        ? 'before:absolute before:inset-x-1 before:-top-1 before:h-0.5 before:rounded-full before:bg-blue-500'
        : 'after:absolute after:inset-x-1 after:-bottom-1 after:h-0.5 after:rounded-full after:bg-blue-500'
      : '';
    return `relative transition-all duration-200 ease-out motion-reduce:transition-none ${indicator}`;
  };

  const toggleSection = (section: string) => {
    setOpenSections(prev => ({
      ...prev,
      [section]: !prev[section]
    }));
  };

  const isMarketplaceActive = ['analises-shopee', 'analises-mercadolivre', 'analises-ifood'].includes(currentTab);
  const isAnalisesActive = currentTab.startsWith('analises-') && !isMarketplaceActive;
  const isAdsActive = currentTab.startsWith('ads-');
  const isSimuladoresActive = currentTab.startsWith('simuladores-');
  const isMensagensActive = currentTab.startsWith('mensagens-');
  const hiddenStaffScreenStyle = (screenId: string) =>
    isStaff && !isStaffLibraryScreenEnabled(screenId) ? { display: 'none' } : undefined;

  return (
    <aside 
      className={`bg-white border-r border-slate-200 flex flex-col transition-all duration-300 relative select-none shrink-0 ${
        collapsed ? 'w-16' : 'w-64'
      }`}
    >
      {/* Header / Cloudflare Orange Cloud Logo */}
      <div className="h-16 flex items-center px-4 border-b border-slate-100 overflow-hidden">
        <div className="flex items-center min-w-[200px]">
          {/* Logo BHS Inteligente SVG */}
          <div className="h-10 w-10 shrink-0 flex items-center justify-center rounded-xl bg-gradient-to-br from-slate-50 to-slate-100 border border-slate-200/60 shadow-sm relative group overflow-hidden">
            {/* Efeito sutil de background hover glow */}
            <div className="absolute inset-0 bg-gradient-to-br from-teal-500/5 to-cyan-500/5 opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
            <svg 
              viewBox="0 0 24 24" 
              className="h-6.5 w-6.5 transition-all duration-300 group-hover:scale-110" 
              strokeWidth="1.6" 
              strokeLinecap="round" 
              strokeLinejoin="round"
            >
              <defs>
                {/* Gradiente principal da Nuvem */}
                <linearGradient id="bhsCloudGrad" x1="0%" y1="0%" x2="100%" y2="100%">
                  <stop offset="0%" stopColor="#0ea5e9" /> {/* sky-500 */}
                  <stop offset="50%" stopColor="#0d9488" /> {/* teal-600 */}
                  <stop offset="100%" stopColor="#0f766e" /> {/* teal-700 */}
                </linearGradient>
                {/* Gradiente dos Racks de Servidor */}
                <linearGradient id="bhsServerGrad" x1="0%" y1="0%" x2="100%" y2="0%">
                  <stop offset="0%" stopColor="#0f172a" />
                  <stop offset="100%" stopColor="#334155" />
                </linearGradient>
              </defs>
              
              {/* Nuvem principal (estilizada com gradiente) */}
              <path 
                d="M 8.5 4.5 A 7.5 7.5 0 1 1 4.5 14.5" 
                stroke="url(#bhsCloudGrad)" 
                fill="url(#bhsCloudGrad)" 
                fillOpacity="0.06" 
              />
              <path 
                d="M 7.2 19 A 7.5 7.5 0 0 1 4.5 15.5" 
                stroke="url(#bhsCloudGrad)" 
                fill="none" 
              />
              
              {/* Nuvenzinha superior esquerda */}
              <path 
                d="M 5.5 6.5 A 2 2 0 0 0 2 8 A 2 2 0 0 0 4.5 10 A 1.8 1.8 0 0 0 5.5 9.8" 
                fill="url(#bhsCloudGrad)" 
                fillOpacity="0.18" 
              />
              
              {/* Nuvenzinha inferior direita */}
              <path 
                d="M 18.5 14 A 2 2 0 0 1 22 15.5 A 2 2 0 0 1 19.5 17.5 A 1.8 1.8 0 0 1 18.5 17.3" 
                fill="url(#bhsCloudGrad)" 
                fillOpacity="0.18" 
              />
              
              {/* Racks de Servidor (com LEDs vivos) */}
              {/* Servidor 1 */}
              <rect x="8.5" y="7.2" width="7" height="1.8" rx="0.4" fill="url(#bhsServerGrad)" stroke="url(#bhsCloudGrad)" strokeWidth="0.5" />
              <circle cx="10.2" cy="8.1" r="0.45" fill="#10b981" /> {/* LED Verde Operacional */}
              <circle cx="11.7" cy="8.1" r="0.45" fill="#10b981" /> {/* LED Verde Operacional */}
              
              {/* Servidor 2 */}
              <rect x="8.5" y="10.2" width="7" height="1.8" rx="0.4" fill="url(#bhsServerGrad)" stroke="url(#bhsCloudGrad)" strokeWidth="0.5" />
              <circle cx="10.2" cy="11.1" r="0.45" fill="#10b981" />
              <circle cx="11.7" cy="11.1" r="0.45" fill="#f59e0b" className="animate-pulse" /> {/* LED Laranja atividade */}
              
              {/* Servidor 3 */}
              <rect x="8.5" y="13.2" width="7" height="1.8" rx="0.4" fill="url(#bhsServerGrad)" stroke="url(#bhsCloudGrad)" strokeWidth="0.5" />
              <circle cx="10.2" cy="14.1" r="0.45" fill="#10b981" />
              <circle cx="11.7" cy="14.1" r="0.45" fill="#10b981" />
              
              {/* Conexões de Rede base */}
              <path d="M 12 15 v 4" stroke="url(#bhsCloudGrad)" strokeWidth="1" />
              <path d="M 9.5 19 h 5" stroke="url(#bhsCloudGrad)" strokeWidth="1" />
              <circle cx="12" cy="19" r="0.75" fill="#0d9488" />
            </svg>
          </div>
          {!collapsed && (
            <div className="ml-2.5 flex flex-col min-w-0">
              <span className="font-extrabold text-slate-800 text-sm tracking-tight leading-none bg-gradient-to-r from-slate-900 to-slate-700 bg-clip-text text-transparent">
                BHS Soluções
              </span>
              <span className="text-[10px] text-slate-400 font-bold truncate mt-1 tracking-wide">
                contato@bhs.com.br
              </span>
            </div>
          )}
        </div>
      </div>

      {/* Sidebar Navigation */}
      <div className="flex flex-1 flex-col py-4 overflow-y-auto px-3 space-y-4">
        {/* Botão discreto para salvar ordem e sair do modo edição */}
        {editMode && !collapsed && (
          <div className="flex items-center justify-between px-2.5 py-2 bg-blue-50/60 border border-blue-200/60 rounded-lg">
            <span className="text-[10px] font-bold text-blue-600 uppercase tracking-wider">Modo edição</span>
            <button
              type="button"
              onClick={() => setEditMode(false)}
              className="flex items-center gap-1 px-2 py-1 bg-blue-600 hover:bg-blue-700 text-white rounded-md text-[10px] font-bold transition-colors cursor-pointer"
            >
              <Check className="w-3 h-3" />
              Salvar ordem
            </button>
          </div>
        )}
        {isStaff && (
        <>
        
        {/* SECTION 1: APRESENTAÇÃO / OBSERVE */}
        <div className="space-y-1">
          {!collapsed && (
            <p className="px-2.5 text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-2">
              Laboratorio Mock
            </p>
          )}

          {/* Group 1: Gestão */}
          <div>
            <button
              onClick={() => !collapsed && toggleSection('analises')}
              className={`w-full flex items-center justify-between px-2.5 py-2 rounded-md text-sm font-semibold transition-all ${
                isAnalisesActive 
                  ? 'text-slate-900 bg-slate-50/50' 
                  : 'text-slate-600 hover:bg-slate-50'
              }`}
            >
              <div className="flex items-center space-x-2.5">
                <Eye className="w-4 h-4 text-slate-500 shrink-0" />
                {!collapsed && <span>Gestão (BI)</span>}
              </div>
              {!collapsed && (
                openSections.analises ? <ChevronDown className="w-3.5 h-3.5 text-slate-400" /> : <ChevronRight className="w-3.5 h-3.5 text-slate-400" />
              )}
            </button>

             {/* Sub-items under vertical line */}
            {openSections.analises && !collapsed && (
              <div className="ml-4 pl-3.5 border-l border-slate-200 mt-1 space-y-1">
                {[
                  { id: 'analises-overview', label: 'Visão Geral' },
                  { id: 'analises-rfv', label: 'Análise RFV (Segmentos)' },
                  { id: 'analises-region', label: 'Análise Regional (UFs)' },
                  { id: 'analises-performance', label: 'Metas & Desempenho' },
                  { id: 'analises-mapa', label: 'Mapa de Vendas' }
                ].filter(item => isStaffLibraryScreenEnabled(item.id)).map(item => {
                  const isActive = currentTab === item.id;
                  return (
                    <button
                      key={item.id}
                      onClick={() => setCurrentTab(item.id)}
                      className={`w-full text-left px-2 py-1.5 rounded text-xs transition-all ${
                        isActive 
                          ? 'text-blue-600 font-bold bg-blue-50/40' 
                          : 'text-slate-600 hover:text-slate-900 hover:bg-slate-50/70'
                      }`}
                    >
                      {item.label}
                    </button>
                  );
                })}
              </div>
            )}
          </div>

          {/* Group 1.2: Marketplaces */}
          <div>
            <button
              onClick={() => !collapsed && toggleSection('marketplaces')}
              className={`w-full flex items-center justify-between px-2.5 py-2 rounded-md text-sm font-semibold transition-all ${
                isMarketplaceActive 
                  ? 'text-slate-900 bg-slate-50/50' 
                  : 'text-slate-600 hover:bg-slate-50'
              }`}
            >
              <div className="flex items-center space-x-2.5">
                <ShoppingBag className="w-4 h-4 text-slate-500 shrink-0" />
                {!collapsed && <span>Marketplaces</span>}
              </div>
              {!collapsed && (
                openSections.marketplaces ? <ChevronDown className="w-3.5 h-3.5 text-slate-400" /> : <ChevronRight className="w-3.5 h-3.5 text-slate-400" />
              )}
            </button>

            {/* Sub-items under vertical line */}
            {openSections.marketplaces && !collapsed && (
              <div className="ml-4 pl-3.5 border-l border-slate-200 mt-1 space-y-1">
                {[
                  { id: 'analises-shopee', label: 'Shopee' },
                  { id: 'analises-mercadolivre', label: 'Mercado Livre' },
                  { id: 'analises-ifood', label: 'iFood' }
                ].filter(item => isStaffLibraryScreenEnabled(item.id)).map(item => {
                  const isActive = currentTab === item.id;
                  return (
                    <button
                      key={item.id}
                      onClick={() => setCurrentTab(item.id)}
                      className={`w-full text-left px-2 py-1.5 rounded text-xs transition-all ${
                        isActive 
                          ? 'text-blue-600 font-bold bg-blue-50/40' 
                          : 'text-slate-600 hover:text-slate-900 hover:bg-slate-50/70'
                      }`}
                    >
                      {item.label}
                    </button>
                  );
                })}
              </div>
            )}
          </div>

          {/* Group 1.5: Financeiro */}
          <div>
            <button
              onClick={() => !collapsed && toggleSection('financeiro')}
              className={`w-full flex items-center justify-between px-2.5 py-2 rounded-md text-sm font-semibold transition-all ${
                currentTab.startsWith('financeiro-') 
                  ? 'text-slate-900 bg-slate-50/50' 
                  : 'text-slate-600 hover:bg-slate-50'
              }`}
            >
              <div className="flex items-center space-x-2.5">
                <Database className="w-4 h-4 text-slate-500 shrink-0" />
                {!collapsed && <span>Financeiro (BI)</span>}
              </div>
              {!collapsed && (
                openSections.financeiro ? <ChevronDown className="w-3.5 h-3.5 text-slate-400" /> : <ChevronRight className="w-3.5 h-3.5 text-slate-400" />
              )}
            </button>

            {openSections.financeiro && !collapsed && (
              <div className="ml-4 pl-3.5 border-l border-slate-200 mt-1 space-y-1">
                {[
                  { id: 'financeiro-pagar', label: 'Contas a Pagar' },
                  { id: 'financeiro-receber', label: 'Contas a Receber' },
                  { id: 'financeiro-conciliacao', label: 'Conciliação Bancária' },
                  { id: 'financeiro-dre', label: 'DRE Gerencial' }
                ].filter(item => isStaffLibraryScreenEnabled(item.id)).map(item => {
                  const isActive = currentTab === item.id;
                  return (
                    <button
                      key={item.id}
                      onClick={() => setCurrentTab(item.id)}
                      className={`w-full text-left px-2 py-1.5 rounded text-xs transition-all ${
                        isActive 
                          ? 'text-blue-600 font-bold bg-blue-50/40' 
                          : 'text-slate-600 hover:text-slate-900 hover:bg-slate-50/70'
                      }`}
                    >
                      {item.label}
                    </button>
                  );
                })}
              </div>
            )}
          </div>

          {/* Group 1.6: Ads */}
          <div>
            <button
              onClick={() => !collapsed && toggleSection('ads')}
              className={`w-full flex items-center justify-between px-2.5 py-2 rounded-md text-sm font-semibold transition-all ${
                isAdsActive
                  ? 'text-slate-900 bg-slate-50/50'
                  : 'text-slate-600 hover:bg-slate-50'
              }`}
            >
              <div className="flex items-center space-x-2.5">
                <Megaphone className="w-4 h-4 text-slate-500 shrink-0" />
                {!collapsed && <span>Ads (BI)</span>}
              </div>
              {!collapsed && (
                openSections.ads ? <ChevronDown className="w-3.5 h-3.5 text-slate-400" /> : <ChevronRight className="w-3.5 h-3.5 text-slate-400" />
              )}
            </button>

            {openSections.ads && !collapsed && (
              <div className="ml-4 pl-3.5 border-l border-slate-200 mt-1 space-y-1">
                {[
                  { id: 'ads-meta', label: 'Meta Ads' },
                  { id: 'ads-google-analytics', label: 'Google Analytics' }
                ].filter(item => isStaffLibraryScreenEnabled(item.id)).map(item => {
                  const isActive = currentTab === item.id;
                  return (
                    <button
                      key={item.id}
                      onClick={() => setCurrentTab(item.id)}
                      className={`w-full text-left px-2 py-1.5 rounded text-xs transition-all ${
                        isActive
                          ? 'text-blue-600 font-bold bg-blue-50/40'
                          : 'text-slate-600 hover:text-slate-900 hover:bg-slate-50/70'
                      }`}
                    >
                      {item.label}
                    </button>
                  );
                })}
              </div>
            )}
          </div>
        </div>

        {/* SECTION: COGNITIVO / AGENTE */}
        <div className="space-y-1" style={hiddenStaffScreenStyle('agente')}>
          {!collapsed && (
            <p className="px-2.5 text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-2">
              Cognitivo
            </p>
          )}

          <div>
            <button
              onClick={() => setCurrentTab('agente')}
              className={`w-full flex items-center justify-between px-2.5 py-2 rounded-md text-sm font-semibold transition-all ${
                currentTab === 'agente' 
                  ? 'text-blue-600 bg-blue-50/40 font-bold' 
                  : 'text-slate-600 hover:bg-slate-50'
              }`}
            >
              <div className="flex items-center space-x-2.5">
                <Bot className={`w-4 h-4 shrink-0 ${currentTab === 'agente' ? 'text-blue-600' : 'text-slate-500'}`} />
                {!collapsed && <span>Agente de Decisão</span>}
              </div>
            </button>
          </div>
        </div>

        {/* SECTION 2: SIMULAÇÕES / SIMULATE */}
        <div className="space-y-1" style={hiddenStaffScreenStyle('simuladores-combos')}>
          {!collapsed && (
            <p className="px-2.5 text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-2">
              Simulate
            </p>
          )}

          {/* Group 3: Simuladores */}
          <div>
            <button
              onClick={() => !collapsed && toggleSection('simuladores')}
              className={`w-full flex items-center justify-between px-2.5 py-2 rounded-md text-sm font-semibold transition-all ${
                isSimuladoresActive 
                  ? 'text-slate-900 bg-slate-50/50' 
                  : 'text-slate-600 hover:bg-slate-50'
              }`}
            >
              <div className="flex items-center space-x-2.5">
                <Sliders className="w-4 h-4 text-slate-500 shrink-0" />
                {!collapsed && <span>Simuladores</span>}
              </div>
              {!collapsed && (
                openSections.simuladores ? <ChevronDown className="w-3.5 h-3.5 text-slate-400" /> : <ChevronRight className="w-3.5 h-3.5 text-slate-400" />
              )}
            </button>

            {openSections.simuladores && !collapsed && (
              <div className="ml-4 pl-3.5 border-l border-slate-200 mt-1 space-y-1">
                {[
                  { id: 'simuladores-combos', label: 'Simulador de Combos' }
                ].filter(item => isStaffLibraryScreenEnabled(item.id)).map(item => {
                  const isActive = currentTab === item.id;
                  return (
                    <button
                      key={item.id}
                      onClick={() => setCurrentTab(item.id)}
                      className={`w-full text-left px-2 py-1.5 rounded text-xs transition-all ${
                        isActive 
                          ? 'text-blue-600 font-bold bg-blue-50/40' 
                          : 'text-slate-600 hover:text-slate-900 hover:bg-slate-50/70'
                      }`}
                    >
                      {item.label}
                    </button>
                  );
                })}
              </div>
            )}
          </div>
        </div>

        <div className="space-y-1" style={hiddenStaffScreenStyle('mensagens-disparos-whatsapp')}>
          {!collapsed && (
            <p className="px-2.5 text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-2">
              Comunicação
            </p>
          )}
          <div>
            <button
              onClick={() => !collapsed && toggleSection('mensagens')}
              className={`w-full flex items-center justify-between px-2.5 py-2 rounded-md text-sm font-semibold transition-all ${
                isMensagensActive ? 'text-slate-900 bg-slate-50/50' : 'text-slate-600 hover:bg-slate-50'
              }`}
            >
              <div className="flex items-center space-x-2.5">
                <MessageCircle className="w-4 h-4 text-slate-500 shrink-0" />
                {!collapsed && <span>Mensagens</span>}
              </div>
              {!collapsed && (openSections.mensagens ? <ChevronDown className="w-3.5 h-3.5 text-slate-400" /> : <ChevronRight className="w-3.5 h-3.5 text-slate-400" />)}
            </button>
            {openSections.mensagens && !collapsed && (
              <div className="ml-4 pl-3.5 border-l border-slate-200 mt-1 space-y-1">
                <button
                  onClick={() => setCurrentTab('mensagens-disparos-whatsapp')}
                  className={`w-full text-left px-2 py-1.5 rounded text-xs transition-all ${currentTab === 'mensagens-disparos-whatsapp' ? 'text-blue-600 font-bold bg-blue-50/40' : 'text-slate-600 hover:text-slate-900 hover:bg-slate-50/70'}`}
                >
                  Disparos no WhatsApp
                </button>
              </div>
            )}
          </div>
        </div>

        {/* SECTION 3: CADASTROS / BUILD */}
        <div className="space-y-1" style={hiddenStaffScreenStyle('workspace-dados')}>
          {!collapsed && (
            <p className="px-2.5 text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-2">
              Producao
            </p>
          )}

          {/* Group 2: Cadastros */}
          <div>
            <button
              onClick={() => !collapsed && toggleSection('cadastros')}
              className={`w-full flex items-center justify-between px-2.5 py-2 rounded-md text-sm font-semibold transition-all ${
                currentTab === 'cadastros' || currentTab === 'workspace-dados'
                  ? 'text-slate-900 bg-slate-50/50' 
                  : 'text-slate-600 hover:bg-slate-50'
              }`}
            >
              <div className="flex items-center space-x-2.5">
                <Database className="w-4 h-4 text-slate-500 shrink-0" />
                {!collapsed && <span>Dados do Cliente</span>}
              </div>
              {!collapsed && (
                openSections.cadastros ? <ChevronDown className="w-3.5 h-3.5 text-slate-400" /> : <ChevronRight className="w-3.5 h-3.5 text-slate-400" />
              )}
            </button>

            {openSections.cadastros && !collapsed && (
              <div className="ml-4 pl-3.5 border-l border-slate-200 mt-1 space-y-1">
                <button
                  onClick={() => setCurrentTab('workspace-dados')}
                  className={`w-full text-left px-2 py-1.5 rounded text-xs transition-all ${
                    currentTab === 'workspace-dados' 
                      ? 'text-blue-600 font-bold bg-blue-50/40' 
                      : 'text-slate-600 hover:text-slate-900 hover:bg-slate-50/70'
                  }`}
                >
                  Workspace de Dados
                </button>
                <button
                  onClick={() => setCurrentTab('cadastros')}
                  className={`w-full text-left px-2 py-1.5 rounded text-xs transition-all ${
                    currentTab === 'cadastros' 
                      ? 'text-blue-600 font-bold bg-blue-50/40' 
                      : 'text-slate-600 hover:text-slate-900 hover:bg-slate-50/70'
                  }`}
                >
                  Registros Gerais
                </button>
              </div>
            )}
          </div>
        </div>

        {/* Group: Dynamic IA Modules */}
        </>
        )}

        {!isStaff && visibleUserModules.filter(m => m.id !== 'mod-base-dados').length === 0 && !collapsed && !isTenantMaster && (
          <div className="px-2.5 py-3 text-xs text-slate-500 leading-5">
            Nenhuma tela publicada para este cliente.
          </div>
        )}
        {!isStaff && visibleUserModules.filter(m => m.id !== 'mod-base-dados').map(mod => {
          const isSectionOpen = !!openSections[mod.id];
          const hasActiveTab = mod.screens.some(s => s.id === currentTab);
          
          return (
            <div
              key={mod.id}
              id={`sidebar-item-${mod.id}`}
              style={{ order: menuPosition(mod.id) }}
              className={`${dragClasses(mod.id)} space-y-1 rounded-md border border-transparent ${canReorder && editMode && !collapsed ? 'cursor-grab active:cursor-grabbing' : ''} ${draggingModuleId === mod.id ? 'scale-[0.98] opacity-45' : ''}`}
            >
              <button
                onPointerDown={(event) => {
                  if (!canReorder || !editMode || collapsed || event.button !== 0) return;
                  pointerDrag.current = { id: mod.id, startY: event.clientY, active: false };
                  event.currentTarget.setPointerCapture(event.pointerId);
                }}
                onPointerMove={editMode ? movePointerDrag : undefined}
                onPointerUp={editMode ? finishPointerDrag : undefined}
                onPointerCancel={editMode ? finishPointerDrag : undefined}
                onClick={() => {
                  if (!collapsed && !suppressModuleClick.current) toggleSection(mod.id);
                }}
                className={`w-full touch-none flex items-center justify-between px-2.5 py-2 rounded-md text-sm font-semibold transition-all ${
                  hasActiveTab
                    ? 'text-slate-900 bg-slate-50/50' 
                    : 'text-slate-600 hover:bg-slate-50'
                }`}
              >
                <div className="flex items-center space-x-2.5">
                  {canReorder && editMode && !collapsed && <GripVertical className="h-4 w-4 shrink-0 text-slate-300 hover:text-slate-500 cursor-grab" aria-hidden="true" />}
                  {mod.icon === 'ShoppingBag' && <ShoppingBag className="w-4 h-4 text-slate-500 shrink-0" />}
                  {mod.icon === 'TrendingUp' && <TrendingUp className="w-4 h-4 text-slate-500 shrink-0" />}
                  {mod.icon === 'Globe' && <Globe className="w-4 h-4 text-slate-500 shrink-0" />}
                  {mod.icon === 'FileText' && <FileText className="w-4 h-4 text-slate-500 shrink-0" />}
                  {mod.icon !== 'ShoppingBag' && mod.icon !== 'TrendingUp' && mod.icon !== 'Globe' && mod.icon !== 'FileText' && <Folder className="w-4 h-4 text-slate-500 shrink-0" />}
                  {!collapsed && <span>{mod.label}</span>}
                </div>
                {!collapsed && (
                  isSectionOpen ? <ChevronDown className="w-3.5 h-3.5 text-slate-400" /> : <ChevronRight className="w-3.5 h-3.5 text-slate-400" />
                )}
              </button>

              {isSectionOpen && !collapsed && (
                <div className="ml-4 pl-3.5 border-l border-slate-200 mt-1 space-y-1">
                  {mod.screens.map(scr => (
                    <button
                      key={scr.id}
                      onClick={() => setCurrentTab(scr.id)}
                      className={`w-full text-left px-2 py-1.5 rounded text-xs transition-all ${
                        currentTab === scr.id 
                          ? 'text-blue-600 font-bold bg-blue-50/40' 
                          : 'text-slate-600 hover:text-slate-900 hover:bg-slate-50/70'
                      }`}
                    >
                      {scr.label}
                    </button>
                  ))}
                </div>
              )}
            </div>
          );
        })}

        {(isStaff || isTenantMaster) && (
        <>
        {/* SECTION 4: AJUSTES */}
        <div
          id="sidebar-item-configuracoes"
          style={{ order: menuPosition('configuracoes') }}
          className={`${dragClasses('configuracoes')} space-y-1`}
        >
          {!collapsed && (
            <p className="px-2.5 text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-2">
              {isStaff ? 'Publicação' : 'Administração'}
            </p>
          )}

          {/* Group 4: Configurações */}
          <div>
            <button
              onClick={() => !collapsed && toggleSection('configuracoes')}
              className={`w-full flex items-center justify-between px-2.5 py-2 rounded-md text-sm font-semibold transition-all ${
                currentTab === 'configuracoes' 
                  ? 'text-slate-900 bg-slate-50/50' 
                  : 'text-slate-600 hover:bg-slate-50'
              }`}
            >
              <div className="flex items-center space-x-2.5">
                <Settings className="w-4 h-4 text-slate-500 shrink-0" />
                {!collapsed && <span>Configurações</span>}
              </div>
              {!collapsed && (
                openSections.configuracoes ? <ChevronDown className="w-3.5 h-3.5 text-slate-400" /> : <ChevronRight className="w-3.5 h-3.5 text-slate-400" />
              )}
            </button>

            {openSections.configuracoes && !collapsed && (
              <div className="ml-4 pl-3.5 border-l border-slate-200 mt-1 space-y-1">
                <button
                  onClick={() => setCurrentTab('configuracoes')}
                  className={`w-full text-left px-2 py-1.5 rounded text-xs transition-all ${
                    currentTab === 'configuracoes' 
                      ? 'text-blue-600 font-bold bg-blue-50/40' 
                      : 'text-slate-600 hover:text-slate-900 hover:bg-slate-50/70'
                  }`}
                >
                  {isStaff ? 'Preferências' : 'Configurações'}
                </button>
              </div>
            )}
          </div>
        </div>
        </>
        )}

      </div>

      {/* Collapse/Expand Toggle Button */}
      <button
        onClick={() => setCollapsed(!collapsed)}
        className="absolute -right-3 top-20 bg-white border border-slate-200 text-slate-500 hover:text-slate-800 h-6 w-6 rounded-full flex items-center justify-center shadow-sm cursor-pointer z-50 hover:bg-slate-50 transition-colors"
      >
        {collapsed ? <ChevronRight className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5 rotate-90" />}
      </button>

      {/* Account menu: fixed at the sidebar footer, following the chat-app interaction model. */}
      <div className="relative border-t border-slate-100 p-3">
        {accountMenuOpen && (
          <>
            <div className="fixed inset-0 z-40" onClick={() => setAccountMenuOpen(false)} />
            <div className={`absolute bottom-full z-50 mb-2 rounded-xl border border-slate-200 bg-white p-2 shadow-xl ${collapsed ? 'left-2 w-60' : 'left-3 right-3'}`}>
              {!collapsed && <div className="border-b border-slate-100 px-2 py-2.5"><p className="truncate text-sm font-bold text-slate-800">{currentUser?.name}</p><p className="mt-0.5 truncate text-[10px] text-slate-400">{currentUser?.email}</p></div>}
              <button type="button" onClick={() => { setAccountMenuOpen(false); onOpenAccount(); }} className="mt-1 flex w-full items-center gap-2 rounded-lg px-2.5 py-2 text-left text-xs font-semibold text-slate-700 hover:bg-slate-50"><CircleUserRound className="h-4 w-4 text-slate-500" />Minha conta</button>
              {(isStaff || isTenantMaster) && <button type="button" onClick={() => { setAccountMenuOpen(false); setCurrentTab('configuracoes'); }} className="flex w-full items-center gap-2 rounded-lg px-2.5 py-2 text-left text-xs font-semibold text-slate-700 hover:bg-slate-50"><Sliders className="h-4 w-4 text-slate-500" />{isStaff ? 'Painel de controle' : 'Gestão de usuários'}</button>}
              {canReorder && !isStaff && <button type="button" onClick={() => { setAccountMenuOpen(false); setEditMode(true); }} className="flex w-full items-center gap-2 rounded-lg px-2.5 py-2 text-left text-xs font-semibold text-slate-700 hover:bg-slate-50"><Pencil className="h-4 w-4 text-slate-500" />Editar menu</button>}
              {isStaff && <button type="button" onClick={() => { const enabled = isConfigApiEnabled(); localStorage.setItem('bhs_config_api_enabled', enabled ? 'false' : 'true'); clearSession(); clearTenantDataCache(); window.location.reload(); }} className={`flex w-full items-center gap-2 rounded-lg px-2.5 py-2 text-left text-xs font-semibold ${isConfigApiEnabled() ? 'text-rose-600 hover:bg-rose-50' : 'text-emerald-600 hover:bg-emerald-50'}`}><Database className="h-4 w-4" />{isConfigApiEnabled() ? 'Ativar modo mockado' : 'Conectar à API real'}</button>}
              <div className="my-1 border-t border-slate-100" />
              <button type="button" onClick={() => { setAccountMenuOpen(false); onLogout(); }} className="flex w-full items-center gap-2 rounded-lg px-2.5 py-2 text-left text-xs font-bold text-rose-600 hover:bg-rose-50"><LogOut className="h-4 w-4" />Sair</button>
            </div>
          </>
        )}
        <button type="button" onClick={() => setAccountMenuOpen((open) => !open)} className={`flex w-full items-center gap-2 rounded-lg p-2 text-left hover:bg-slate-50 ${collapsed ? 'justify-center' : ''}`} title={currentUser?.name ?? 'Minha conta'}>
          <span className="relative flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-blue-500/10 text-xs font-bold text-blue-700">{currentUser?.is_staff ? 'BHS' : (currentUser?.name ?? 'U').slice(0, 2).toUpperCase()}<span className="absolute bottom-0 right-0 h-2.5 w-2.5 rounded-full border-2 border-white bg-emerald-500" /></span>
          {!collapsed && <span className="min-w-0 flex-1"><span className="block truncate text-xs font-bold text-slate-700">{currentUser?.name}</span><span className="block truncate text-[10px] text-slate-400">Minha conta</span></span>}
          {!collapsed && <ChevronDown className="h-3.5 w-3.5 text-slate-400" />}
        </button>
      </div>
    </aside>
  );
};
