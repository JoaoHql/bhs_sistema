import React, { useState } from 'react';
import { 
  Database, 
  Settings, 
  ChevronDown, 
  ChevronRight, 
  Eye,
  Sliders
} from 'lucide-react';

interface SidebarProps {
  currentTab: string;
  setCurrentTab: (tab: string) => void;
  collapsed: boolean;
  setCollapsed: (collapsed: boolean) => void;
}

export const Sidebar: React.FC<SidebarProps> = ({
  currentTab,
  setCurrentTab,
  collapsed,
  setCollapsed
}) => {
  // Collapsible sections state
  const [openSections, setOpenSections] = useState<Record<string, boolean>>({
    analises: true,
    cadastros: true,
    configuracoes: true,
    simuladores: true
  });

  const toggleSection = (section: string) => {
    setOpenSections(prev => ({
      ...prev,
      [section]: !prev[section]
    }));
  };

  const isAnalisesActive = currentTab.startsWith('analises-');
  const isSimuladoresActive = currentTab.startsWith('simuladores-');

  return (
    <aside 
      className={`bg-white border-r border-slate-200 flex flex-col transition-all duration-300 relative select-none shrink-0 ${
        collapsed ? 'w-16' : 'w-64'
      }`}
    >
      {/* Header / Cloudflare Orange Cloud Logo */}
      <div className="h-16 flex items-center px-4 border-b border-slate-100 overflow-hidden">
        <div className="flex items-center space-x-2.5 min-w-[200px]">
          {/* SVG Cloud Logo */}
          <div className="shrink-0">
            <svg viewBox="0 0 24 24" className="w-7 h-7 text-blue-600 fill-none stroke-current" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
              {/* Círculo/Nuvem principal */}
              <path d="M 8.5 4.5 A 7.5 7.5 0 1 1 4.5 14.5" />
              <path d="M 7.2 19 A 7.5 7.5 0 0 1 4.5 15.5" />
              
              {/* Nuvenzinha superior esquerda */}
              <path d="M 5.5 6.5 A 2 2 0 0 0 2 8 A 2 2 0 0 0 4.5 10 A 1.8 1.8 0 0 0 5.5 9.8" fill="currentColor" fillOpacity="0.2" />
              
              {/* Nuvenzinha inferior direita */}
              <path d="M 18.5 14 A 2 2 0 0 1 22 15.5 A 2 2 0 0 1 19.5 17.5 A 1.8 1.8 0 0 1 18.5 17.3" fill="currentColor" fillOpacity="0.2" />
              
              {/* Servidor (Rack de 3 unidades) */}
              <rect x="8.5" y="7" width="7" height="2" rx="0.3" strokeWidth="1.5" />
              <circle cx="10.25" cy="8" r="0.4" fill="currentColor" stroke="none" />
              <circle cx="11.75" cy="8" r="0.4" fill="currentColor" stroke="none" />
              
              <rect x="8.5" y="10.5" width="7" height="2" rx="0.3" strokeWidth="1.5" />
              <circle cx="10.25" cy="11.5" r="0.4" fill="currentColor" stroke="none" />
              <circle cx="11.75" cy="11.5" r="0.4" fill="currentColor" stroke="none" />
              
              <rect x="8.5" y="14" width="7" height="2" rx="0.3" strokeWidth="1.5" />
              <circle cx="10.25" cy="15" r="0.4" fill="currentColor" stroke="none" />
              <circle cx="11.75" cy="15" r="0.4" fill="currentColor" stroke="none" />
              
              {/* Base de conexão de rede */}
              <path d="M 12 16 v 3" />
              <path d="M 9.5 19 h 5" />
              <circle cx="12" cy="19" r="0.7" fill="currentColor" stroke="none" />
            </svg>
          </div>
          {!collapsed && (
            <div className="flex flex-col">
              <span className="font-bold text-slate-800 text-sm tracking-tight leading-none">BHS Soluções</span>
              <span className="text-[10px] text-slate-400 font-semibold truncate mt-1">contato@bhs.com.br</span>
            </div>
          )}
        </div>
      </div>

      {/* Sidebar Navigation */}
      <div className="flex-1 py-4 overflow-y-auto px-3 space-y-4">
        
        {/* SECTION 1: APRESENTAÇÃO / OBSERVE */}
        <div className="space-y-1">
          {!collapsed && (
            <p className="px-2.5 text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-2">
              Observe
            </p>
          )}

          {/* Group 1: Análise */}
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
                {!collapsed && <span>Análises (BI)</span>}
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
                ].map(item => {
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

        {/* SECTION 2: CADASTROS / BUILD */}
        <div className="space-y-1">
          {!collapsed && (
            <p className="px-2.5 text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-2">
              Build
            </p>
          )}

          {/* Group 2: Cadastros */}
          <div>
            <button
              onClick={() => !collapsed && toggleSection('cadastros')}
              className={`w-full flex items-center justify-between px-2.5 py-2 rounded-md text-sm font-semibold transition-all ${
                currentTab === 'cadastros' 
                  ? 'text-slate-900 bg-slate-50/50' 
                  : 'text-slate-600 hover:bg-slate-50'
              }`}
            >
              <div className="flex items-center space-x-2.5">
                <Database className="w-4 h-4 text-slate-500 shrink-0" />
                {!collapsed && <span>Base de Dados</span>}
              </div>
              {!collapsed && (
                openSections.cadastros ? <ChevronDown className="w-3.5 h-3.5 text-slate-400" /> : <ChevronRight className="w-3.5 h-3.5 text-slate-400" />
              )}
            </button>

            {openSections.cadastros && !collapsed && (
              <div className="ml-4 pl-3.5 border-l border-slate-200 mt-1 space-y-1">
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

        {/* SECTION 3: SIMULAÇÕES / SIMULATE */}
        <div className="space-y-1">
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
                ].map(item => {
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

        {/* SECTION 4: AJUSTES */}
        <div className="space-y-1">
          {!collapsed && (
            <p className="px-2.5 text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-2">
              Ajustes
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
                  Preferências
                </button>
              </div>
            )}
          </div>
        </div>

      </div>

      {/* Collapse/Expand Toggle Button */}
      <button
        onClick={() => setCollapsed(!collapsed)}
        className="absolute -right-3 top-20 bg-white border border-slate-200 text-slate-500 hover:text-slate-800 h-6 w-6 rounded-full flex items-center justify-center shadow-sm cursor-pointer z-50 hover:bg-slate-50 transition-colors"
      >
        {collapsed ? <ChevronRight className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5 rotate-90" />}
      </button>

      {/* Footer Status */}
      <div className="p-4 border-t border-slate-100">
        <div className="flex items-center space-x-2 text-slate-400 hover:text-slate-600 transition-colors">
          <div className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></div>
          {!collapsed && <span className="text-[10px] font-bold tracking-wider uppercase">Ambiente Seguro</span>}
        </div>
      </div>
    </aside>
  );
};
