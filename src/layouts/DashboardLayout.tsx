import React, { useState } from 'react';
import { useDashboard } from '../store/dashboardStore';
import { Sidebar } from './Sidebar';
import { RefreshCw, Filter, X, User } from 'lucide-react';

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
    period,
    setPeriod,
    branch,
    setBranch,
    region,
    setRegion,
    cluster,
    setCluster,
    searchQuery,
    setSearchQuery,
    clearFilters,
    isSyncing,
    lastUpdated,
    syncNow
  } = useDashboard();

  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);

  // Check if any filters are active
  const hasActiveFilters = branch !== 'All' || region !== 'All' || cluster !== 'All' || searchQuery !== '';

  const getBreadcrumbTitle = () => {
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
      />

      {/* Main Container */}
      <div className="flex-1 flex flex-col min-w-0 overflow-hidden relative">
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
            {/* Sync Status / Action */}
            <div className="flex items-center space-x-2.5 text-xs text-slate-600 bg-slate-50 px-3 py-2 rounded-md border border-slate-200 shadow-sm">
              <span className="flex h-2.5 w-2.5 relative">
                <span className={`animate-ping absolute inline-flex h-full w-full rounded-full ${isSyncing ? 'bg-orange-400' : 'bg-emerald-400'} opacity-75`}></span>
                <span className={`relative inline-flex rounded-full h-2.5 w-2.5 ${isSyncing ? 'bg-orange-500' : 'bg-emerald-500'}`}></span>
              </span>
              <span className="font-medium">{isSyncing ? 'Sincronizando...' : `Última carga: ${lastUpdated}`}</span>
              <button
                onClick={syncNow}
                disabled={isSyncing}
                className="text-slate-500 hover:text-orange-600 transition-colors disabled:opacity-50 ml-1.5 cursor-pointer"
                title="Atualizar dados agora"
              >
                <RefreshCw className={`w-3.5 h-3.5 ${isSyncing ? 'animate-spin text-orange-500' : ''}`} />
              </button>
            </div>

            {/* Period Dropdown - Zoom Aproximado */}
            <div className="flex items-center space-x-2">
              <span className="text-xs text-slate-500 font-bold uppercase tracking-wider">Período:</span>
              <select
                value={period}
                onChange={(e) => setPeriod(e.target.value)}
                className="bg-white border border-slate-200 rounded-md text-xs font-semibold text-slate-700 px-3 py-2 focus:outline-none focus:border-orange-500 hover:border-slate-300 transition-colors cursor-pointer shadow-sm"
              >
                <option value="Jun/2026">Junho 2026</option>
                <option value="Mai/2026">Maio 2026</option>
                <option value="Abr/2026">Abril 2026</option>
              </select>
            </div>

            {/* Branch Dropdown - Zoom Aproximado */}
            <div className="flex items-center space-x-2">
              <span className="text-xs text-slate-500 font-bold uppercase tracking-wider">Filial:</span>
              <select
                value={branch}
                onChange={(e) => setBranch(e.target.value)}
                className="bg-white border border-slate-200 rounded-md text-xs font-semibold text-slate-700 px-3 py-2 focus:outline-none focus:border-orange-500 hover:border-slate-300 transition-colors cursor-pointer shadow-sm"
              >
                <option value="All">Todas Filiais</option>
                <option value="Filial Sul">Filial Sul</option>
                <option value="Filial Sudeste">Filial Sudeste</option>
                <option value="Filial Nordeste">Filial Nordeste</option>
              </select>
            </div>

            {/* User Profile Badge (Cloudflare-like) */}
            <div className="h-9 w-9 rounded-full bg-slate-100 border border-slate-200 flex items-center justify-center text-slate-600 hover:bg-slate-200 transition-colors cursor-pointer" title="Bruno Henrique Silva (Admin)">
              <User className="w-4 h-4" />
            </div>
          </div>
        </header>

        {/* Active Filters Bar */}
        {hasActiveFilters && (
          <div className="bg-white border-b border-slate-200 py-2.5 px-6 shadow-inner-sm shrink-0 z-10 transition-all">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-2.5 flex-wrap gap-y-1.5">
                <span className="text-xs text-slate-400 font-bold uppercase tracking-wider flex items-center mr-1">
                  <Filter className="w-3.5 h-3.5 mr-1.5 text-slate-400" /> Filtros Ativos:
                </span>

                {/* Branch Filter Tag */}
                {branch !== 'All' && (
                  <span className="inline-flex items-center space-x-1.5 bg-orange-50 text-orange-700 text-xs font-semibold px-2.5 py-1 rounded-md border border-orange-200 shadow-sm">
                    <span>Filial: {branch}</span>
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
                onClick={clearFilters}
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

        {/* Footer */}
        <footer className="bg-white border-t border-slate-200 py-3 text-center shrink-0 z-10 shadow-sm">
          <span className="text-[11px] text-slate-400 font-bold tracking-wider uppercase">
            BI BHS Soluções Inteligentes © 2026. Mocked Environment. Replicando UI Cloudflare de Alta Performance.
          </span>
        </footer>
      </div>
    </div>
  );
};
