import React, { useState } from 'react';
import { 
  Database, 
  Settings, 
  ChevronDown, 
  ChevronRight, 
  Eye,
  Sliders,
  Bot
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
  const [openSections, setOpenSections] = useState<Record<string, boolean>>({
    analises: true,
    financeiro: true,
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
      <div className="flex-1 py-4 overflow-y-auto px-3 space-y-4">
        
        {/* SECTION 1: APRESENTAÇÃO / OBSERVE */}
        <div className="space-y-1">
          {!collapsed && (
            <p className="px-2.5 text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-2">
              Observe
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

        {/* SECTION: COGNITIVO / AGENTE */}
        <div className="space-y-1">
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

        {/* SECTION 3: CADASTROS / BUILD */}
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
