import React, { useState } from 'react';
import { useDashboard } from '../store/dashboardStore';
import { Sidebar } from './Sidebar';
import { Filter, X, Sparkles, HelpCircle, LogOut, Sliders, Database, CircleUserRound } from 'lucide-react';
import { AskAIDrawer } from '../components/shared/AskAIDrawer';
import { ToastNotification } from '../components/shared/ToastNotification';
import { clearTenantDataCache } from '../services/tenantDataCache';
import { isConfigApiEnabled } from '../services/configApi';
import { AccountDialog } from '../components/account/AccountDialog';

interface DashboardLayoutProps {
  currentTab: string;
  setCurrentTab: (tab: string) => void;
  children: React.ReactNode;
}

export const DashboardLayout: React.FC<DashboardLayoutProps> = ({
  currentTab,
  setCurrentTab,
  children
}) => {
  const {
    dataMode,
    dataStatus,
    period,
    setPeriod,
    branch,
    setBranch,
    screenFilterConfigs,
    region,
    setRegion,
    cluster,
    setCluster,
    searchQuery,
    setSearchQuery,
    clearFilters,
    setIsAskDrawerOpen,
    previewMode,
    setPreviewMode,
    setPreviewConfig,
    currentUser,
    setCurrentUser
  } = useDashboard();

  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [userMenuOpen, setUserMenuOpen] = useState(false);
  const [accountOpen, setAccountOpen] = useState(false);
  const isStaff = !!currentUser?.is_staff;
  const isMessagesTab = currentTab.startsWith('mensagens-');
  const isSimuladoresTab = currentTab.startsWith('simuladores-');
  const activeFilterConfig = screenFilterConfigs[currentTab];
  const periodFilter = activeFilterConfig?.period ?? {
    label: 'Periodo',
    options: [
      { value: 'Jun/2026', label: 'Junho 2026' },
      { value: 'Mai/2026', label: 'Maio 2026' },
      { value: 'Abr/2026', label: 'Abril 2026' },
    ],
  };
  const branchFilter = activeFilterConfig?.branch ?? {
    label: 'Filial',
    allLabel: 'Todas Filiais',
    options: [
      { value: 'Filial Sul', label: 'Filial Sul' },
      { value: 'Filial Sudeste', label: 'Filial Sudeste' },
      { value: 'Filial Nordeste', label: 'Filial Nordeste' },
    ],
  };

  // Check if any filters are active
  const hasActivePeriod = Boolean(activeFilterConfig?.period?.allLabel) && period !== 'All';
  const hasActiveBranch = branchFilter.allowAll !== false && branch !== 'All';
  const hasActiveFilters = hasActivePeriod || hasActiveBranch || region !== 'All' || cluster !== 'All' || searchQuery !== '';

  const getBreadcrumbTitle = () => {
    if (currentTab.startsWith('analises-')) return 'Modulo de Analises';
    if (currentTab.startsWith('financeiro-')) return 'Modulo Financeiro';
    if (currentTab.startsWith('ads-')) return 'Modulo Ads';
    if (currentTab.startsWith('simuladores-')) return 'Simuladores';
    if (currentTab === 'agente') return 'Agente de Decisao';

    switch (currentTab) {
      case 'analises':
        return 'Módulo de Análises';
      case 'cadastros':
        return 'Cadastros & Base de Dados';
      case 'configuracoes':
        return 'Configurações do Painel';
      default:
        return 'Painel';
    }
  };

  return (
    <div className="h-screen w-screen flex overflow-hidden bg-slate-50 font-sans antialiased text-slate-900">
      {/* Sidebar - Cloudflare Format */}
      <Sidebar 
        currentTab={currentTab} 
        setCurrentTab={setCurrentTab} 
        collapsed={sidebarCollapsed} 
        setCollapsed={setSidebarCollapsed} 
        onOpenAccount={() => setAccountOpen(true)}
        onLogout={() => {
          localStorage.removeItem('bhs_auth_token');
          localStorage.setItem('bhs_config_api_enabled', 'true');
          clearTenantDataCache();
          setCurrentTab('');
          setCurrentUser(null);
        }}
      />

      {/* Main Container */}
      <div className="flex-1 flex flex-col min-w-0 overflow-hidden relative">
        {/* Banner Preview */}
        {previewMode && (
          <div className="bg-orange-600 text-white px-6 py-2.5 flex items-center justify-between shrink-0 text-xs font-bold uppercase tracking-wider shadow-md z-30 select-none">
            <div className="flex items-center space-x-2">
              <span className="h-2.5 w-2.5 rounded-full bg-white inline-block animate-ping"></span>
              <span>Modo Preview Ativo — Visualizando Telas em Rascunho</span>
            </div>
            <button
              onClick={() => {
                setPreviewMode(false);
                setPreviewConfig(null);
              }}
              className="bg-white/20 hover:bg-white/30 text-white border-none rounded px-3 py-1 cursor-pointer transition-colors text-[10px] font-bold uppercase tracking-wider"
            >
              Desativar
            </button>
          </div>
        )}
        {/* Top Header */}
        <header className="h-16 bg-white border-b border-slate-200 flex items-center justify-between px-6 shrink-0 shadow-sm z-20">
          {/* Breadcrumbs / Page Title - Zoom Aproximado */}
          <div className="flex items-center space-x-2">
            <span className="text-slate-400 text-sm font-medium">Dashboard</span>
            <span className="text-slate-300 text-sm font-medium">/</span>
            <span className="text-slate-800 text-base font-bold tracking-tight">{getBreadcrumbTitle()}</span>
          </div>

          {/* Top Bar Macro Filters & Actions */}
          <div className="flex items-center space-x-4">
            <div className={`${isStaff ? 'hidden lg:inline-flex' : 'hidden'} items-center rounded-md border px-2.5 py-1.5 text-[10px] font-bold uppercase tracking-wider ${
              dataStatus === 'error'
                ? 'border-red-200 bg-red-50 text-red-700'
                : dataStatus === 'fallback'
                ? 'border-amber-200 bg-amber-50 text-amber-700'
                : 'border-slate-200 bg-slate-50 text-slate-600'
            }`}>
              {dataMode} · {dataStatus}
            </div>


            {!isMessagesTab && !isSimuladoresTab && <>
            {/* Period Dropdown */}
            <div className="flex items-center space-x-2">
              <span className="text-xs text-slate-500 font-bold uppercase tracking-wider">{periodFilter.label}:</span>
              <select
                value={period}
                onChange={(e) => setPeriod(e.target.value)}
                className="bg-white border border-slate-200 rounded-md text-xs font-semibold text-slate-700 px-3 py-2 focus:outline-none focus:border-orange-500 hover:border-slate-300 transition-colors cursor-pointer shadow-sm"
              >
                {periodFilter.allLabel && <option value="All">{periodFilter.allLabel}</option>}
                {periodFilter.options.map(option => (
                  <option key={option.value} value={option.value}>{option.label}</option>
                ))}
              </select>
            </div>

            {/* Branch Dropdown */}
            <div className="flex items-center space-x-2">
              <span className="text-xs text-slate-500 font-bold uppercase tracking-wider">{branchFilter.label}:</span>
              <select
                value={branch}
                onChange={(e) => setBranch(e.target.value)}
                disabled={branchFilter.options.length === 0}
                className="bg-white border border-slate-200 rounded-md text-xs font-semibold text-slate-700 px-3 py-2 focus:outline-none focus:border-orange-500 hover:border-slate-300 transition-colors cursor-pointer shadow-sm"
              >
                {branchFilter.allowAll !== false && <option value="All">{branchFilter.allLabel || 'Todos'}</option>}
                {branchFilter.options.map(option => (
                  <option key={option.value} value={option.value}>{option.label}</option>
                ))}
              </select>
            </div>
            </>}

            {/* Ask AI Button (Cloudflare Style) */}
            <button
              onClick={() => setIsAskDrawerOpen(true)}
              className={`${isStaff ? 'inline-flex' : 'hidden'} items-center space-x-1.5 px-3 py-1.5 hover:bg-slate-100 rounded-lg text-xs font-semibold text-slate-650 transition-all cursor-pointer border-none bg-transparent shrink-0`}
              title="Perguntar à IA (Criar/Configurar Telas)"
            >
              <Sparkles className="w-4 h-4 text-blue-600" />
              <span>Ask AI</span>
            </button>

            {/* Suporte Button (Cloudflare Style) */}
            <button
              className="inline-flex items-center space-x-1.5 px-3 py-1.5 hover:bg-slate-100 rounded-lg text-xs font-semibold text-slate-650 transition-all cursor-pointer border-none bg-transparent shrink-0"
              title="Obter Suporte"
            >
              <HelpCircle className="w-4 h-4 text-slate-500" />
              <span>Suporte</span>
            </button>

            {/* Account control moved to the sidebar footer. */}
            {false && (
            <div className="relative">
              <button
                onClick={() => setUserMenuOpen(!userMenuOpen)}
                className="h-9 w-9 rounded-full bg-blue-500/10 border border-blue-500/25 flex items-center justify-center text-blue-600 hover:bg-blue-500/20 hover:border-blue-500/40 transition-all cursor-pointer shadow-inner relative focus:outline-none"
                title={currentUser?.name || "Usuário"}
              >
                {currentUser?.is_staff ? (
                  <span className="text-[11px] font-black font-mono tracking-tighter text-blue-700">BHS</span>
                ) : (
                  <span className="text-xs font-bold font-mono text-blue-600">
                    {(currentUser?.name || 'U').substring(0, 2).toUpperCase()}
                  </span>
                )}
                {/* Active connection dot indicator */}
                <span className={`absolute bottom-0 right-0 h-2.5 w-2.5 rounded-full border border-white ${isConfigApiEnabled() ? 'bg-emerald-500' : 'bg-amber-500'}`}></span>
              </button>

              {userMenuOpen && (
                <>
                  {/* Invisible overlay to close on click outside */}
                  <div className="fixed inset-0 z-40 cursor-default" onClick={() => setUserMenuOpen(false)} />
                  
                  {/* Dropdown Menu */}
                  <div className="absolute right-0 mt-2.5 w-64 bg-white/95 backdrop-blur-xl border border-slate-200 rounded-xl shadow-xl py-2.5 z-50 animate-in fade-in slide-in-from-top-2 duration-100 font-sans select-none">
                    {/* User profile header */}
                    <div className="px-4 py-2 border-b border-slate-100 pb-3 mb-2">
                      <div className="font-bold text-slate-800 text-sm truncate">{currentUser?.name}</div>
                      <div className="text-slate-400 text-[10px] font-mono truncate mt-0.5">{currentUser?.email}</div>
                      <div className="flex items-center space-x-1.5 mt-2">
                        <span className={`inline-block px-1.5 py-0.5 rounded text-[9px] font-bold border ${
                          currentUser?.is_staff 
                            ? 'bg-blue-50 text-blue-700 border-blue-200' 
                            : 'bg-purple-50 text-purple-700 border-purple-200'
                        }`}>
                          {currentUser?.is_staff ? 'Equipe Interna BHS' : 'Cliente Admin'}
                        </span>
                        {currentUser?.client_id && (
                          <span className="bg-slate-50 border border-slate-200 text-slate-500 text-[9px] font-bold px-1.5 py-0.5 rounded truncate max-w-[120px]">
                            {currentUser?.client_id}
                          </span>
                        )}
                      </div>
                    </div>

                    {/* Mode Toggle Button */}
                    <div className="px-2.5 py-1">
                      <button
                        onClick={() => {
                          setUserMenuOpen(false);
                          setAccountOpen(true);
                        }}
                        className="w-full flex items-center space-x-2.5 px-3 py-2 rounded-lg text-xs font-semibold text-slate-700 hover:bg-slate-50 transition-all text-left"
                      >
                        <CircleUserRound className="w-3.5 h-3.5 text-slate-500" />
                        <span>Minha conta</span>
                      </button>
                    </div>

                    {/* Mode Toggle Button */}
                    <div className={`${isStaff ? 'block' : 'hidden'} px-2.5 py-1`}>
                      <button
                        onClick={() => {
                          const current = isConfigApiEnabled();
                          localStorage.setItem('bhs_config_api_enabled', current ? 'false' : 'true');
                          localStorage.removeItem('bhs_auth_token');
                          clearTenantDataCache();
                          window.location.reload();
                        }}
                        className={`w-full flex items-center space-x-2.5 px-3 py-2 rounded-lg text-xs font-semibold tracking-wide transition-all text-left ${
                          isConfigApiEnabled()
                            ? 'text-rose-600 hover:bg-rose-50'
                            : 'text-emerald-600 hover:bg-emerald-50'
                        }`}
                      >
                        <Database className="w-3.5 h-3.5" />
                        <span>{isConfigApiEnabled() ? 'Ativar Modo Mockado' : 'Conectar à API Real'}</span>
                      </button>
                    </div>

                    {/* Configuration / Administration Access */}
                    {(currentUser?.is_staff || currentUser?.roles.includes('admin')) && (
                      <div className="px-2.5 py-1">
                        <button
                          onClick={() => {
                            setUserMenuOpen(false);
                            setCurrentTab('configuracoes');
                          }}
                          className="w-full flex items-center space-x-2.5 px-3 py-2 rounded-lg text-xs font-semibold text-slate-700 hover:bg-slate-50 transition-all text-left"
                        >
                          <Sliders className="w-3.5 h-3.5 text-slate-500" />
                          <span>{currentUser?.is_staff ? 'Painel de Controle' : 'Gestão de Usuários'}</span>
                        </button>
                      </div>
                    )}

                    {/* Divider */}
                    <div className="border-t border-slate-100 my-2" />

                    {/* Logout Button */}
                    <div className="px-2.5 py-1">
                      <button
                        onClick={() => {
                          localStorage.removeItem('bhs_auth_token');
                          localStorage.setItem('bhs_config_api_enabled', 'true');
                          clearTenantDataCache();
                          setUserMenuOpen(false);
                          setCurrentTab('');
                          setCurrentUser(null);
                        }}
                        className="w-full flex items-center space-x-2.5 px-3 py-2 rounded-lg text-xs font-bold text-rose-600 hover:bg-rose-50 transition-all text-left"
                      >
                        <LogOut className="w-3.5 h-3.5" />
                        <span>Sair do Sistema</span>
                      </button>
                    </div>

                  </div>
                </>
              )}
            </div>
            )}
          </div>
        </header>

        {/* Active Filters Bar */}
        {!isMessagesTab && hasActiveFilters && (
          <div className="bg-white border-b border-slate-200 py-2.5 px-6 shadow-inner-sm shrink-0 z-10 transition-all">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-2.5 flex-wrap gap-y-1.5">
                <span className="text-xs text-slate-400 font-bold uppercase tracking-wider flex items-center mr-1">
                  <Filter className="w-3.5 h-3.5 mr-1.5 text-slate-400" /> Filtros Ativos:
                </span>

                {hasActivePeriod && (
                  <span className="inline-flex items-center space-x-1.5 bg-orange-50 text-orange-700 text-xs font-semibold px-2.5 py-1 rounded-md border border-orange-200 shadow-sm">
                    <span>{periodFilter.label}: {periodFilter.options.find(option => option.value === period)?.label || period}</span>
                    <button onClick={() => setPeriod('All')} className="hover:bg-orange-100 p-0.5 rounded transition-colors cursor-pointer">
                      <X className="w-3 h-3" />
                    </button>
                  </span>
                )}

                {/* Branch Filter Tag */}
                {hasActiveBranch && (
                  <span className="inline-flex items-center space-x-1.5 bg-orange-50 text-orange-700 text-xs font-semibold px-2.5 py-1 rounded-md border border-orange-200 shadow-sm">
                    <span>{branchFilter.label}: {branchFilter.options.find(option => option.value === branch)?.label || branch}</span>
                    <button onClick={() => setBranch('All')} className="hover:bg-orange-100 p-0.5 rounded transition-colors cursor-pointer">
                      <X className="w-3 h-3" />
                    </button>
                  </span>
                )}

                {/* Region Filter Tag */}
                {region !== 'All' && (
                  <span className="inline-flex items-center space-x-1.5 bg-blue-50 text-blue-700 text-xs font-semibold px-2.5 py-1 rounded-md border border-blue-200 shadow-sm">
                    <span>UF: {region}</span>
                    <button onClick={() => setRegion('All')} className="hover:bg-blue-100 p-0.5 rounded transition-colors cursor-pointer">
                      <X className="w-3 h-3" />
                    </button>
                  </span>
                )}

                {/* Cluster Filter Tag */}
                {cluster !== 'All' && (
                  <span className="inline-flex items-center space-x-1.5 bg-purple-50 text-purple-700 text-xs font-semibold px-2.5 py-1 rounded-md border border-purple-200 shadow-sm">
                    <span>RFV: {cluster}</span>
                    <button onClick={() => setCluster('All')} className="hover:bg-purple-100 p-0.5 rounded transition-colors cursor-pointer">
                      <X className="w-3 h-3" />
                    </button>
                  </span>
                )}

                {/* Search Query Tag */}
                {searchQuery !== '' && (
                  <span className="inline-flex items-center space-x-1.5 bg-slate-100 text-slate-700 text-xs font-semibold px-2.5 py-1 rounded-md border border-slate-200 shadow-sm">
                    <span>Busca: "{searchQuery}"</span>
                    <button onClick={() => setSearchQuery('')} className="hover:bg-slate-200 p-0.5 rounded transition-colors cursor-pointer">
                      <X className="w-3 h-3" />
                    </button>
                  </span>
                )}
              </div>

              <button
                onClick={() => {
                  clearFilters();
                  if (activeFilterConfig?.period?.allLabel) setPeriod('All');
                }}
                className="text-xs font-bold text-red-600 hover:text-red-700 transition-colors uppercase tracking-wider cursor-pointer"
              >
                Limpar Filtros
              </button>
            </div>
          </div>
        )}

        {/* Scrollable View Report (Content Area) */}
        <main className={`flex-1 flex flex-col ${currentTab === 'agente' ? 'overflow-hidden p-0' : 'overflow-y-auto p-6 md:p-8 space-y-6'} bg-slate-50`}>
          {children}
        </main>

        {currentUser && accountOpen && (
          <AccountDialog
            open={accountOpen}
            onOpenChange={setAccountOpen}
            user={currentUser}
            onSaved={setCurrentUser}
          />
        )}

        {/* Footer */}
        <footer className="bg-white border-t border-slate-200 py-3 text-center shrink-0 z-10 shadow-sm">
          <span className="hidden">
            BI BHS Soluções Inteligentes © 2026. Mocked Environment. Replicando UI Cloudflare de Alta Performance.
          </span>
          <span className="text-[11px] text-slate-400 font-bold tracking-wider uppercase">
            BI BHS Solucoes Inteligentes 2026. Ambiente tenant runtime.
          </span>
        </footer>
      </div>
      
      {/* Ask AI Dynamic Drawer Panel */}
      <AskAIDrawer />

      {/* Global Toast Notifications */}
      <ToastNotification />
    </div>
  );
};
