import React from 'react';
import { useDashboard } from '../store/dashboardStore';
import { RefreshCw, Filter, X, BarChart3, Database, Settings } from 'lucide-react';


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

  // Check if any filters are active
  const hasActiveFilters = branch !== 'All' || region !== 'All' || cluster !== 'All' || searchQuery !== '';

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col font-sans antialiased text-slate-900 selection:bg-orange-100 selection:text-orange-900">
      {/* Top Header */}
      <header className="sticky top-0 z-50 bg-white border-b border-slate-200 shadow-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between h-14 items-center">
            {/* Logo and Name */}
            <div className="flex items-center space-x-3">
              <div className="h-8 w-8 rounded bg-orange-500 flex items-center justify-center text-white font-bold text-sm tracking-wider shadow-sm">
                BI
              </div>
              <div>
                <span className="font-semibold text-slate-900 text-sm tracking-tight block">BHS Soluções Inteligentes</span>
                <span className="text-[10px] text-slate-500 font-medium block uppercase tracking-wider -mt-1">Painel Executivo</span>
              </div>
            </div>

            {/* Navigation Tabs */}
            <nav className="flex space-x-1 h-full items-end pt-1">
              {[
                { id: 'analises', label: 'Análises', icon: BarChart3 },
                { id: 'cadastros', label: 'Cadastros', icon: Database },
                { id: 'configuracoes', label: 'Configurações', icon: Settings },
              ].map((tab) => {
                const Icon = tab.icon;
                const isActive = currentTab === tab.id;
                return (
                  <button
                    key={tab.id}
                    onClick={() => setCurrentTab(tab.id)}
                    className={`flex items-center space-x-1.5 px-3.5 pb-2.5 pt-3 border-b-2 text-[12px] font-medium transition-colors ${
                      isActive
                        ? 'border-orange-500 text-orange-600 font-semibold'
                        : 'border-transparent text-slate-600 hover:text-slate-900 hover:border-slate-300'
                    }`}
                  >
                    <Icon className="w-3.5 h-3.5" />
                    <span>{tab.label}</span>
                  </button>
                );
              })}
            </nav>

            {/* Top Bar Macro Filters */}
            <div className="flex items-center space-x-3">
              {/* Sync Status / Action */}
              <div className="flex items-center space-x-2 text-[11px] text-slate-500 bg-slate-50 px-2.5 py-1.5 rounded border border-slate-200">
                <span className="flex h-2 w-2 relative">
                  <span className={`animate-ping absolute inline-flex h-full w-full rounded-full ${isSyncing ? 'bg-orange-400' : 'bg-emerald-400'} opacity-75`}></span>
                  <span className={`relative inline-flex rounded-full h-2 w-2 ${isSyncing ? 'bg-orange-500' : 'bg-emerald-500'}`}></span>
                </span>
                <span>{isSyncing ? 'Sincronizando...' : `Última carga: ${lastUpdated}`}</span>
                <button
                  onClick={syncNow}
                  disabled={isSyncing}
                  className="text-slate-600 hover:text-orange-600 transition-colors disabled:opacity-50 ml-1.5"
                  title="Atualizar dados agora"
                >
                  <RefreshCw className={`w-3.5 h-3.5 ${isSyncing ? 'animate-spin text-orange-500' : ''}`} />
                </button>
              </div>

              {/* Period Dropdown */}
              <div className="flex items-center space-x-1">
                <span className="text-[10px] text-slate-400 font-semibold uppercase tracking-wider">Período:</span>
                <select
                  value={period}
                  onChange={(e) => setPeriod(e.target.value)}
                  className="bg-white border border-slate-200 rounded text-[11px] font-medium text-slate-700 px-2 py-1 focus:outline-none focus:border-orange-500 transition-colors"
                >
                  <option value="Jun/2026">Junho 2026</option>
                  <option value="Mai/2026">Maio 2026</option>
                  <option value="Abr/2026">Abril 2026</option>
                </select>
              </div>

              {/* Branch Dropdown */}
              <div className="flex items-center space-x-1">
                <span className="text-[10px] text-slate-400 font-semibold uppercase tracking-wider">Filial:</span>
                <select
                  value={branch}
                  onChange={(e) => setBranch(e.target.value)}
                  className="bg-white border border-slate-200 rounded text-[11px] font-medium text-slate-700 px-2 py-1 focus:outline-none focus:border-orange-500 transition-colors"
                >
                  <option value="All">Todas Filiais</option>
                  <option value="Filial Sul">Filial Sul</option>
                  <option value="Filial Sudeste">Filial Sudeste</option>
                  <option value="Filial Nordeste">Filial Nordeste</option>
                </select>
              </div>
            </div>
          </div>
        </div>
      </header>

      {/* Active Filters Bar */}
      {hasActiveFilters && (
        <div className="bg-white border-b border-slate-200 py-1.5 px-4 shadow-inner-sm transition-all">
          <div className="max-w-7xl mx-auto flex items-center justify-between">
            <div className="flex items-center space-x-2 flex-wrap gap-y-1">
              <span className="text-[10px] text-slate-400 font-semibold uppercase tracking-wider flex items-center mr-1">
                <Filter className="w-3 h-3 mr-1 text-slate-400" /> Filtros Ativos:
              </span>

              {/* Branch Filter Tag */}
              {branch !== 'All' && (
                <span className="inline-flex items-center space-x-1 bg-orange-50 text-orange-700 text-[11px] font-medium px-2 py-0.5 rounded border border-orange-200 shadow-sm">
                  <span>Filial: {branch}</span>
                  <button onClick={() => setBranch('All')} className="hover:bg-orange-100 p-0.5 rounded transition-colors">
                    <X className="w-3 h-3" />
                  </button>
                </span>
              )}

              {/* Region Filter Tag */}
              {region !== 'All' && (
                <span className="inline-flex items-center space-x-1 bg-blue-50 text-blue-700 text-[11px] font-medium px-2 py-0.5 rounded border border-blue-200 shadow-sm">
                  <span>UF: {region}</span>
                  <button onClick={() => setRegion('All')} className="hover:bg-blue-100 p-0.5 rounded transition-colors">
                    <X className="w-3 h-3" />
                  </button>
                </span>
              )}

              {/* Cluster Filter Tag */}
              {cluster !== 'All' && (
                <span className="inline-flex items-center space-x-1 bg-purple-50 text-purple-700 text-[11px] font-medium px-2 py-0.5 rounded border border-purple-200 shadow-sm">
                  <span>RFV: {cluster}</span>
                  <button onClick={() => setCluster('All')} className="hover:bg-purple-100 p-0.5 rounded transition-colors">
                    <X className="w-3 h-3" />
                  </button>
                </span>
              )}

              {/* Search Query Tag */}
              {searchQuery !== '' && (
                <span className="inline-flex items-center space-x-1 bg-slate-100 text-slate-700 text-[11px] font-medium px-2 py-0.5 rounded border border-slate-200 shadow-sm">
                  <span>Busca: "{searchQuery}"</span>
                  <button onClick={() => setSearchQuery('')} className="hover:bg-slate-200 p-0.5 rounded transition-colors">
                    <X className="w-3 h-3" />
                  </button>
                </span>
              )}
            </div>

            <button
              onClick={clearFilters}
              className="text-[10px] font-bold text-red-600 hover:text-red-700 transition-colors uppercase tracking-wider"
            >
              Limpar Filtros
            </button>
          </div>
        </div>
      )}

      {/* Main Content Area */}
      <main className="flex-grow max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-6">
        {children}
      </main>

      {/* Footer */}
      <footer className="bg-white border-t border-slate-200 py-3 text-center">
        <span className="text-[10px] text-slate-400 font-medium tracking-wide">
          BI BHS Soluções Inteligentes © 2026. Mocked Environment. Replicando UI Cloudflare de Alta Performance.
        </span>
      </footer>
    </div>
  );
};
