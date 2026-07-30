import React, { useState, useEffect } from 'react';
import { useDashboard } from '../../../store/dashboardStore';
import { DynamicChart } from '../../../components/shared/DynamicChart';
import type { AppWidget, ChartConfig, QueryResponse } from '../../../types';
import { isQueryApiEnabled, queryApi } from '../../../services/queryApi';
import { TrendingUp, Table as TableIcon, FileSpreadsheet, LayoutGrid } from 'lucide-react';
import { useTenantData, useTenantScreenActivity } from '../../../hooks/useTenantData';
import { tenantSessionKey } from '../../../services/tenantDataCache';
import { resolveWidgetPresentation } from '../../../config/widgetPresentation';

interface DynamicCanvasViewProps {
  screenId: string;
}

const formatDisplayValue = (val: number, format?: string) => {
  if (format === 'currency') {
    return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL', maximumFractionDigits: 0 }).format(val);
  }
  return new Intl.NumberFormat('pt-BR').format(val);
};

const DynamicKpiCard: React.FC<{ kpi: AppWidget; idx: number; screenId: string; contentHeight?: number }> = ({ kpi, idx, screenId, contentHeight }) => {
  const { queryWorkspaceData, workspaces, getBackendFilters, currentUser, screenRefreshVersion } = useDashboard();

  const tempConfig: ChartConfig | null = React.useMemo(() => {
    if (!kpi.kpiConfig) return null;
    return {
      id: kpi.id || `kpi-temp-${idx}`,
      workspaceId: kpi.kpiConfig.workspaceId,
      type: 'kpi',
      title: kpi.title || '',
      description: '',
      dimensions: [],
      metrics: [{
        field: kpi.kpiConfig.field,
        label: kpi.kpiConfig.label,
        aggregation: kpi.kpiConfig.aggregation,
        format: kpi.kpiConfig.format === 'currency' ? 'currency' : 'number'
      }]
    };
  }, [idx, kpi]);

  const localValue = React.useMemo(() => {
    if (!tempConfig || !kpi.kpiConfig) return 0;
    try {
      const queryRes = queryWorkspaceData(tempConfig);
      return Number(queryRes[0]?.[kpi.kpiConfig.label] ?? 0);
    } catch (err) {
      console.error('Erro ao calcular KPI local:', err);
      return 0;
    }
  }, [kpi.kpiConfig, queryWorkspaceData, tempConfig]);

  const shouldUseBackend = isQueryApiEnabled() && Boolean(kpi.id);
  const filters = getBackendFilters();
  const { data: backendResponse, isLoading, error } = useTenantData<QueryResponse>({
    enabled: shouldUseBackend && Boolean(kpi.id && kpi.kpiConfig),
    sessionKey: tenantSessionKey(currentUser?.client_slug, currentUser?.id),
    screenId,
    resourceId: kpi.id || `kpi-${idx}`,
    params: { filters, limit: 1 },
    refreshVersion: screenRefreshVersion,
    loader: () => queryApi.query({ screenId, widgetId: kpi.id || '', filters, limit: 1 }),
  });

  if (!kpi.kpiConfig) return null;

  const backendValue = Number(backendResponse?.rows[0]?.[kpi.kpiConfig.label] ?? 0);
  const value = shouldUseBackend ? backendValue : localValue;
  const sourceWorkspace = workspaces.find(w => w.id === kpi.kpiConfig?.workspaceId);
  const sourceName = sourceWorkspace ? sourceWorkspace.fileNameOrConn : 'Base';

  return (
    <div
      className="bg-white border border-slate-200 rounded-xl p-5 shadow-sm transition-all hover:shadow-md hover:translate-y-[-2px] duration-300 flex items-center space-x-4"
      style={contentHeight ? { height: contentHeight } : undefined}
    >
      <div className="p-3 rounded-lg bg-blue-50 text-blue-600 shrink-0">
        <TrendingUp className="w-6 h-6" />
      </div>
      <div className="min-w-0 flex-1">
        <span className="text-xs text-slate-400 font-bold block uppercase tracking-wider truncate">{kpi.title || kpi.kpiConfig.label}</span>
        <span className="text-xl font-extrabold text-slate-800 mt-0.5 block truncate">
          {isLoading ? '...' : error ? '--' : formatDisplayValue(value, kpi.kpiConfig.format)}
        </span>
        <span className="text-[9px] text-slate-400 font-semibold block truncate">Base: {sourceName}</span>
      </div>
    </div>
  );
};

interface DynamicTableCardProps {
  comp: AppWidget;
  screenId: string;
  gridClass: string;
  contentHeight?: number;
  searchQuery: string;
  sort?: { field: string; direction: 'asc' | 'desc' };
  onSearch: (value: string) => void;
  onSort: (field: string) => void;
}

const DynamicTableCard: React.FC<DynamicTableCardProps> = ({ comp, screenId, gridClass, contentHeight, searchQuery, sort, onSearch, onSort }) => {
  const { getWorkspaceRawData, workspaces, getBackendFilters, currentUser, screenRefreshVersion } = useDashboard();
  const shouldUseBackend = isQueryApiEnabled() && Boolean(comp.id);
  const filters = getBackendFilters();
  const { data: backendResponse, isLoading, error } = useTenantData<QueryResponse>({
    enabled: shouldUseBackend && Boolean(comp.id && comp.tableConfig),
    sessionKey: tenantSessionKey(currentUser?.client_slug, currentUser?.id),
    screenId,
    resourceId: comp.id || 'table',
    params: { filters, limit: 100 },
    refreshVersion: screenRefreshVersion,
    loader: () => queryApi.query({ screenId, widgetId: comp.id || '', filters, limit: 100 }),
  });

  if (!comp.tableConfig) return null;

  const rows = shouldUseBackend ? (backendResponse?.rows ?? []) : getWorkspaceRawData(comp.tableConfig.workspaceId);
  let processedRows = [...rows];
  const query = searchQuery.toLowerCase().trim();
  if (query) {
    processedRows = processedRows.filter(row =>
      Object.values(row).some(v => String(v ?? '').toLowerCase().includes(query))
    );
  }

  if (sort) {
    processedRows.sort((a, b) => {
      const valA = a[sort.field];
      const valB = b[sort.field];
      if (typeof valA === 'number' && typeof valB === 'number') {
        return sort.direction === 'asc' ? valA - valB : valB - valA;
      }
      const strA = String(valA ?? '').toLowerCase();
      const strB = String(valB ?? '').toLowerCase();
      if (strA < strB) return sort.direction === 'asc' ? -1 : 1;
      if (strA > strB) return sort.direction === 'asc' ? 1 : -1;
      return 0;
    });
  }

  const limit = 10;
  const slicedRows = processedRows.slice(0, limit);
  const headers = rows.length > 0 ? Object.keys(rows[0]).filter(k => k !== 'connectionParams' && k !== 'fields') : [];
  const sourceWorkspace = workspaces.find(w => w.id === comp.tableConfig?.workspaceId);
  const sourceName = sourceWorkspace ? sourceWorkspace.fileNameOrConn : 'Base';

  return (
    <div
      className={`${gridClass} bg-white border border-slate-200 rounded-xl p-5 shadow-sm hover:shadow-md hover:translate-y-[-2px] transition-all duration-300 flex flex-col gap-4`}
      style={contentHeight ? { height: contentHeight } : undefined}
    >
      <div className="space-y-3 flex flex-1 min-h-0 flex-col">
        <div className="flex items-center justify-between gap-4">
          <div className="flex items-center space-x-2 shrink-0">
            <TableIcon className="w-4.5 h-4.5 text-slate-500" />
            <h4 className="text-xs font-extrabold text-slate-800 tracking-tight uppercase">{comp.title || 'Massa de Dados Integrada'}</h4>
          </div>

          {comp.isEnriched && comp.enrichmentOptions?.showSearch && (
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => onSearch(e.target.value)}
              placeholder="Buscar nesta tabela..."
              className="bg-slate-50 border border-slate-200 rounded-lg text-[10px] font-semibold text-slate-700 px-2.5 py-1.5 focus:outline-none focus:border-blue-500 hover:border-slate-350 transition-colors w-40"
            />
          )}
        </div>

        <p className="text-[10px] text-slate-400 leading-normal font-semibold">
          {isLoading
            ? 'Carregando registros...'
            : error
              ? 'Nao foi possivel carregar a tabela no backend.'
              : `Mostrando as primeiras ${Math.min(limit, processedRows.length)} linhas de ${processedRows.length} registros encontrados na fonte ${sourceName}.`}
        </p>

        {slicedRows.length === 0 ? (
          <div className="text-[11px] text-slate-400 text-center py-8">Nenhum registro correspondente encontrado.</div>
        ) : (
          <div className={`data-table-scroll overflow-auto border border-slate-100 rounded-lg ${contentHeight ? 'flex-1 min-h-0' : 'max-h-[420px]'}`}>
            <table className="min-w-full divide-y divide-slate-100 text-left text-[11px]">
              <thead className="sticky top-0 z-10 bg-slate-50 font-bold text-slate-550 select-none shadow-[0_1px_0_#e2e8f0]">
                <tr>
                  {headers.map(h => {
                    const isSorted = sort?.field === h;
                    const isSortable = comp.isEnriched && comp.enrichmentOptions?.showSort;
                    return (
                      <th
                        key={h}
                        onClick={() => isSortable && onSort(h)}
                        className={`px-3 py-2.5 text-[9px] uppercase tracking-wider ${isSortable ? 'cursor-pointer hover:bg-slate-100 transition-colors' : ''}`}
                      >
                        <div className="flex items-center space-x-1">
                          <span>{h}</span>
                          {isSorted && <span className="text-[8px] text-blue-600 font-bold">{sort.direction === 'asc' ? ' ^' : ' v'}</span>}
                        </div>
                      </th>
                    );
                  })}
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-slate-600 bg-white">
                {slicedRows.map((row, rIdx) => (
                  <tr key={rIdx} className="hover:bg-slate-50/50 transition-colors">
                    {headers.map(h => {
                      const cellVal = row[h];
                      const isNumeric = typeof cellVal === 'number';
                      const displayVal = isNumeric && (h.includes('valor') || h.includes('liquido') || h.includes('pago') || h.includes('gasto') || h.includes('receita'))
                        ? formatDisplayValue(cellVal, 'currency')
                        : String(cellVal ?? '');
                      const isProgressBar = comp.isEnriched && h === comp.enrichmentOptions?.cellProgressBarField;

                      if (isProgressBar && isNumeric) {
                        const maxVal = Math.max(...rows.map(r => Number(r[h]) || 0), 1);
                        const percent = Math.min((Number(cellVal) / maxVal) * 100, 100);
                        return (
                          <td key={h} className="px-3 py-2 font-mono text-[10px] relative min-w-[110px]">
                            <div className="absolute inset-y-1 left-0 bg-blue-500/10 rounded-sm transition-all" style={{ width: `${percent}%` }} />
                            <span className="relative z-10 font-bold text-slate-800">{displayVal}</span>
                          </td>
                        );
                      }

                      return (
                        <td key={h} className={`px-3 py-2 font-mono text-[10px] truncate max-w-[125px] ${isNumeric ? 'text-slate-800 font-semibold' : ''}`}>
                          {displayVal}
                        </td>
                      );
                    })}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      <div className="flex items-center justify-between text-[9px] text-slate-450 border-t border-slate-100 pt-2 font-semibold shrink-0">
        <span>Fonte: <strong className="text-slate-500 font-bold">{sourceName}</strong></span>
        <span>Total original: {rows.length} registros</span>
      </div>
    </div>
  );
};

export const DynamicCanvasView: React.FC<DynamicCanvasViewProps> = ({ screenId }) => {
  const { userModules, currentUser } = useDashboard();
  const [localLayout, setLocalLayout] = useState<'dashboard' | 'canvas'>('dashboard');
  const [searchQueries, setSearchQueries] = useState<Record<number, string>>({});
  const [sortConfig, setSortConfig] = useState<Record<number, { field: string; direction: 'asc' | 'desc' }>>({});

  const handleSort = (tableIdx: number, field: string) => {
    setSortConfig(prev => {
      const current = prev[tableIdx];
      if (current && current.field === field) {
        return {
          ...prev,
          [tableIdx]: { field, direction: current.direction === 'asc' ? 'desc' : 'asc' }
        };
      }
      return {
        ...prev,
        [tableIdx]: { field, direction: 'asc' }
      };
    });
  };

  // Find the active screen in the modules structure
  const activeScreen = React.useMemo(() => {
    for (const mod of userModules) {
      const screen = mod.screens.find(s => s.id === screenId);
      if (screen) return screen;
    }
    return null;
  }, [userModules, screenId]);
  const sessionKey = tenantSessionKey(currentUser?.client_slug, currentUser?.id);
  const pendingVisuals = useTenantScreenActivity(sessionKey, screenId);
  const totalBackendVisuals = activeScreen?.components.filter(component =>
    Boolean(component.id && component.dataSourceId && ['chart', 'kpi_card', 'table'].includes(component.type)),
  ).length ?? 0;

  useEffect(() => {
    if (activeScreen) {
      setLocalLayout(activeScreen.layout);
    }
  }, [activeScreen]);

  if (!activeScreen) {
    return (
      <div className="flex flex-col items-center justify-center p-12 text-center space-y-3 bg-slate-50 border border-slate-100 rounded-xl">
        <LayoutGrid className="w-8 h-8 text-slate-400" />
        <h3 className="font-bold text-slate-800 text-sm">Tela Não Encontrada</h3>
        <p className="text-[11px] text-slate-400 max-w-[240px]">Esta tela dinâmica pode ter sido excluída ou ainda não foi gerada pelo Agente.</p>
      </div>
    );
  }

  // Separate KPIs and other components to render them in a clean dashboard grid
  const kpis = activeScreen.components.filter(c => c.type === 'kpi_card');
  const chartsAndTables = activeScreen.components.filter(c => c.type !== 'kpi_card');

  const getGridSpanClass = (comp: AppWidget) => {
    if (localLayout === 'canvas') return 'col-span-12';
    const presentation = resolveWidgetPresentation(comp.presentation, comp.gridSpan);
    switch (presentation.gridColumns) {
      case 3: return 'col-span-12 md:col-span-3';
      case 4: return 'col-span-12 md:col-span-4';
      case 6: return 'col-span-12 md:col-span-6';
      case 9: return 'col-span-12 md:col-span-9';
      case 12: return 'col-span-12';
      default: return 'col-span-12 lg:col-span-6';
    }
  };

  const getKpiGridClass = (kpi: AppWidget) => {
    const presentation = resolveWidgetPresentation(kpi.presentation, kpi.gridSpan);
    if (presentation.source === 'preset') return getGridSpanClass(kpi);
    if (localLayout === 'canvas') return 'col-span-12 md:col-span-6';
    switch (Math.min(kpis.length, 4)) {
      case 1: return 'col-span-12';
      case 2: return 'col-span-12 md:col-span-6';
      case 3: return 'col-span-12 md:col-span-4';
      default: return 'col-span-12 md:col-span-3';
    }
  };

  return (
    <div className="space-y-6 font-sans select-none">
      {pendingVisuals > 0 && totalBackendVisuals > 0 && (
        <div className="rounded-xl border border-blue-100 bg-blue-50/70 px-4 py-3" role="status" aria-live="polite">
          <div className="flex items-center justify-between text-[11px] font-bold text-blue-700">
            <span>Carregando visuais</span>
            <span>{Math.max(0, totalBackendVisuals - pendingVisuals)} de {totalBackendVisuals}</span>
          </div>
          <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-blue-100">
            <div
              className="h-full rounded-full bg-blue-500 transition-all duration-300"
              style={{ width: `${Math.max(8, ((totalBackendVisuals - pendingVisuals) / totalBackendVisuals) * 100)}%` }}
            />
          </div>
        </div>
      )}
      {/* Canvas Header */}
      <div className="border-b border-slate-200 pb-3 flex items-center justify-between">
        <div>
          <div className="flex items-center space-x-2">
            <span className="h-2 w-2 rounded-full bg-blue-600 inline-block animate-pulse"></span>
            <h2 className="text-lg font-extrabold text-slate-900 tracking-tight">{activeScreen.label}</h2>
          </div>
          <p className="text-[11px] text-slate-400 mt-0.5">
            Dashboard montado dinamicamente via especificação JSON (App Shell encapsulado).
          </p>
        </div>

        <div className="flex items-center space-x-3 shrink-0">
          <div className="flex items-center bg-slate-200/50 border border-slate-200 rounded-lg p-0.5 shadow-inner-sm">
            <button
              onClick={() => setLocalLayout('dashboard')}
              className={`px-2.5 py-1 text-[10px] font-bold rounded-md transition-all cursor-pointer border-none ${
                localLayout === 'dashboard'
                  ? 'bg-white text-slate-800 shadow-xs'
                  : 'text-slate-500 hover:text-slate-800 bg-transparent'
              }`}
            >
              💻 Compacto
            </button>
            <button
              onClick={() => setLocalLayout('canvas')}
              className={`px-2.5 py-1 text-[10px] font-bold rounded-md transition-all cursor-pointer border-none ${
                localLayout === 'canvas'
                  ? 'bg-white text-slate-800 shadow-xs'
                  : 'text-slate-500 hover:text-slate-800 bg-transparent'
              }`}
            >
              🔍 Focado
            </button>
          </div>
          
          <div className="hidden sm:inline-flex items-center space-x-1 bg-slate-100 border border-slate-200 text-slate-500 text-[9px] font-bold px-2 py-1 rounded-lg uppercase shadow-xs">
            <span>Modo Dinâmico</span>
          </div>
        </div>
      </div>

      {/* Render KPIs Row */}
      {kpis.length > 0 && (
        <div className="grid grid-cols-1 md:grid-cols-12 gap-6">
          {kpis.map((kpi, idx) => {
            const presentation = resolveWidgetPresentation(kpi.presentation, kpi.gridSpan);
            return (
              <div key={kpi.id || idx} className={getKpiGridClass(kpi)}>
                <DynamicKpiCard
                  kpi={kpi}
                  idx={idx}
                  screenId={screenId}
                  contentHeight={presentation.source === 'preset' ? presentation.contentHeight : undefined}
                />
              </div>
            );
          })}
        </div>
      )}

      {/* Render Charts and Tables Area */}
      {chartsAndTables.length > 0 && (
        <div className="grid grid-cols-1 md:grid-cols-12 gap-6">
          {chartsAndTables.map((comp, idx) => {
            const presentation = resolveWidgetPresentation(comp.presentation, comp.gridSpan);
            const contentHeight = presentation.source === 'preset' ? presentation.contentHeight : undefined;
            if (comp.type === 'chart' && comp.chartConfig) {
              return (
                <div key={idx} className={getGridSpanClass(comp)}>
                  <DynamicChart
                    config={comp.chartConfig}
                    screenId={screenId}
                    widgetId={comp.id}
                    contentHeight={contentHeight}
                    presentation={presentation.source === 'preset' ? presentation : undefined}
                  />
                </div>
              );
            }

            if (comp.type === 'table' && comp.tableConfig) {
              return (
                <DynamicTableCard
                  key={comp.id || idx}
                  comp={comp}
                  screenId={screenId}
                  gridClass={getGridSpanClass(comp)}
                  contentHeight={contentHeight}
                  searchQuery={searchQueries[idx] || ''}
                  sort={sortConfig[idx]}
                  onSearch={(value) => setSearchQueries(prev => ({ ...prev, [idx]: value }))}
                  onSort={(field) => handleSort(idx, field)}
                />
              );

              /*
              const rows = getWorkspaceRawData(comp.tableConfig!.workspaceId);
              
              // 1. Filter rows dynamically based on searchQueries
              let processedRows = [...rows];
              const query = (searchQueries[idx] || '').toLowerCase().trim();
              if (query) {
                processedRows = processedRows.filter(row => 
                  Object.values(row).some(v => String(v ?? '').toLowerCase().includes(query))
                );
              }

              // 2. Sort rows dynamically based on sortConfig
              const sort = sortConfig[idx];
              if (sort) {
                processedRows.sort((a, b) => {
                  const valA = a[sort.field];
                  const valB = b[sort.field];
                  
                  if (typeof valA === 'number' && typeof valB === 'number') {
                    return sort.direction === 'asc' ? valA - valB : valB - valA;
                  }
                  
                  const strA = String(valA ?? '').toLowerCase();
                  const strB = String(valB ?? '').toLowerCase();
                  if (strA < strB) return sort.direction === 'asc' ? -1 : 1;
                  if (strA > strB) return sort.direction === 'asc' ? 1 : -1;
                  return 0;
                });
              }

              const limit = 10;
              const slicedRows = processedRows.slice(0, limit);
              const headers = rows.length > 0 ? Object.keys(rows[0]).filter(k => k !== 'connectionParams' && k !== 'fields') : [];
              const sourceWorkspace = workspaces.find(w => w.id === comp.tableConfig!.workspaceId);
              const sourceName = sourceWorkspace?.fileNameOrConn || 'Base';

              return (
                <div key={idx} className={`${getGridSpanClass(comp.gridSpan)} bg-white border border-slate-200 rounded-xl p-5 shadow-sm hover:shadow-md hover:translate-y-[-2px] transition-all duration-300 flex flex-col justify-between space-y-4`}>
                  <div className="space-y-3">
                    <div className="flex items-center justify-between gap-4">
                      <div className="flex items-center space-x-2 shrink-0">
                        <TableIcon className="w-4.5 h-4.5 text-slate-500" />
                        <h4 className="text-xs font-extrabold text-slate-800 tracking-tight uppercase">{comp.title || 'Massa de Dados Integrada'}</h4>
                      </div>
                      
                      {comp.isEnriched && comp.enrichmentOptions?.showSearch && (
                        <input 
                          type="text"
                          value={searchQueries[idx] || ''}
                          onChange={(e) => setSearchQueries(prev => ({ ...prev, [idx]: e.target.value }))}
                          placeholder="Buscar nesta tabela..."
                          className="bg-slate-50 border border-slate-200 rounded-lg text-[10px] font-semibold text-slate-700 px-2.5 py-1.5 focus:outline-none focus:border-blue-500 hover:border-slate-350 transition-colors w-40"
                        />
                      )}
                    </div>
                    
                    <p className="text-[10px] text-slate-400 leading-normal font-semibold">
                      Mostrando as primeiras {Math.min(limit, processedRows.length)} linhas de {processedRows.length} registros encontrados na fonte {sourceName}.
                    </p>

                    {slicedRows.length === 0 ? (
                      <div className="text-[11px] text-slate-400 text-center py-8">Nenhum registro correspondente encontrado.</div>
                    ) : (
                      <div className="overflow-x-auto border border-slate-100 rounded-lg">
                        <table className="min-w-full divide-y divide-slate-100 text-left text-[11px]">
                          <thead className="bg-slate-50 font-bold text-slate-550 select-none">
                            <tr>
                              {headers.map(h => {
                                const isSorted = sort?.field === h;
                                const isSortable = comp.isEnriched && comp.enrichmentOptions?.showSort;
                                return (
                                  <th 
                                    key={h} 
                                    onClick={() => isSortable && handleSort(idx, h)}
                                    className={`px-3 py-2.5 text-[9px] uppercase tracking-wider ${
                                      isSortable ? 'cursor-pointer hover:bg-slate-100 transition-colors' : ''
                                    }`}
                                  >
                                    <div className="flex items-center space-x-1">
                                      <span>{h}</span>
                                      {isSorted && (
                                        <span className="text-[8px] text-blue-600 font-bold">
                                          {sort.direction === 'asc' ? ' ▲' : ' ▼'}
                                        </span>
                                      )}
                                    </div>
                                  </th>
                                );
                              })}
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-slate-100 text-slate-600 bg-white">
                            {slicedRows.map((row, rIdx) => (
                              <tr key={rIdx} className="hover:bg-slate-50/50 transition-colors">
                                {headers.map(h => {
                                  const cellVal = row[h];
                                  const isNumeric = typeof cellVal === 'number';
                                  const displayVal = isNumeric && (h.includes('valor') || h.includes('liquido') || h.includes('pago') || h.includes('gasto'))
                                    ? formatValue(cellVal, 'currency')
                                    : String(cellVal ?? '');

                                  const isProgressBar = comp.isEnriched && h === comp.enrichmentOptions?.cellProgressBarField;
                                  
                                  if (isProgressBar && isNumeric) {
                                    const maxVal = Math.max(...rows.map(r => Number(r[h]) || 0), 1);
                                    const percent = Math.min((Number(cellVal) / maxVal) * 100, 100);
                                    return (
                                      <td key={h} className="px-3 py-2 font-mono text-[10px] relative min-w-[110px]">
                                        <div 
                                          className="absolute inset-y-1 left-0 bg-blue-500/10 rounded-sm transition-all" 
                                          style={{ width: `${percent}%` }} 
                                        />
                                        <span className="relative z-10 font-bold text-slate-800">{displayVal}</span>
                                      </td>
                                    );
                                  }

                                  return (
                                    <td key={h} className={`px-3 py-2 font-mono text-[10px] truncate max-w-[125px] ${isNumeric ? 'text-slate-800 font-semibold' : ''}`}>
                                      {displayVal}
                                    </td>
                                  );
                                })}
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    )}
                  </div>

                  <div className="flex items-center justify-between text-[9px] text-slate-450 border-t border-slate-100 pt-2 font-semibold">
                    <span>Fonte: <strong className="text-slate-500 font-bold">{sourceName}</strong></span>
                    <span>Total original: {rows.length} registros</span>
                  </div>
                </div>
              );
              */
            }

            return null;
          })}
        </div>
      )}

      {/* Empty State Banner */}
      {activeScreen.components.length === 0 && (
        <div className="flex flex-col items-center justify-center p-12 text-center border-2 border-dashed border-slate-200 rounded-xl space-y-3">
          <FileSpreadsheet className="w-8 h-8 text-slate-350" />
          <div>
            <h4 className="text-xs font-bold text-slate-700">Tela Dinâmica Vazia</h4>
            <p className="text-[10px] text-slate-400 max-w-[240px] mt-0.5">
              Peça ao Agente de IA no chat para adicionar componentes (gráficos, tabelas ou KPI cards) nesta tela!
            </p>
          </div>
        </div>
      )}
    </div>
  );
};
