import React, { useEffect, useMemo } from 'react';
import { AlertCircle } from 'lucide-react';
import { useDashboard } from '../../../store/dashboardStore';
import { queryApi } from '../../../services/queryApi';
import type { SalesOverviewResponse } from '../../../types';
import { buildSalesOrdersOverviewData, OverviewTemplate } from '../../templates/overview';
import { useTenantData } from '../../../hooks/useTenantData';
import { tenantSessionKey } from '../../../services/tenantDataCache';
import { TenantLoadingState } from '../../../components/shared/TenantLoadingState';

interface SalesOverviewTenantViewProps {
  screenId: string;
}

export const SalesOverviewTenantView: React.FC<SalesOverviewTenantViewProps> = ({ screenId }) => {
  const {
    branch,
    period,
    searchQuery,
    clearFilters,
    setBranch,
    setPeriod,
    setSearchQuery,
    setScreenFilterConfig,
    currentUser,
    screenRefreshVersion,
  } = useDashboard();
  const sessionKey = tenantSessionKey(currentUser?.client_slug, currentUser?.id);
  const { data: response, isLoading, error } = useTenantData<SalesOverviewResponse>({
    sessionKey,
    screenId,
    resourceId: 'sales-overview',
    params: { limit: 500 },
    refreshVersion: screenRefreshVersion,
    loader: () => queryApi.salesOverview({ screenId, limit: 500 }),
  });
  const rows = useMemo(() => response?.rows ?? [], [response]);

  const periodOptions = useMemo(() => {
    const formatter = new Intl.DateTimeFormat('pt-BR', { month: 'long', year: 'numeric', timeZone: 'UTC' });
    return Array.from(new Set(rows.map((row) => row.order_date.slice(0, 7)).filter(Boolean)))
      .sort()
      .map((value) => ({
        value,
        label: formatter.format(new Date(`${value}-01T00:00:00Z`)),
      }));
  }, [rows]);

  const branchOptions = useMemo(() => {
    return Array.from(new Set(rows.map((row) => row.branch).filter(Boolean)))
      .sort((left, right) => left.localeCompare(right))
      .map((value) => ({ value, label: value }));
  }, [rows]);

  useEffect(() => {
    setScreenFilterConfig(screenId, {
      period: {
        label: 'Periodo',
        allLabel: 'Todo periodo',
        options: periodOptions,
      },
      branch: {
        label: 'Filial',
        allLabel: 'Todas filiais',
        options: branchOptions,
      },
    });

    return () => setScreenFilterConfig(screenId, null);
  }, [branchOptions, periodOptions, screenId, setScreenFilterConfig]);

  useEffect(() => {
    if (period !== 'All' && periodOptions.length > 0 && !periodOptions.some((option) => option.value === period)) {
      setPeriod('All');
    }
    if (branch !== 'All' && branchOptions.length > 0 && !branchOptions.some((option) => option.value === branch)) {
      setBranch('All');
    }
  }, [branch, branchOptions, period, periodOptions, setBranch, setPeriod]);

  const data = useMemo(
    () => buildSalesOrdersOverviewData({ rows, period, branch, searchQuery }),
    [branch, period, rows, searchQuery],
  );

  if (isLoading) {
    return <TenantLoadingState label="Carregando vendas do cliente..." />;
  }

  if (error) {
    return (
      <div className="min-h-[360px] flex items-center justify-center">
        <div className="max-w-md text-center border border-red-100 bg-red-50 rounded-xl p-6">
          <AlertCircle className="w-8 h-8 text-red-500 mx-auto mb-3" />
          <h2 className="text-sm font-bold text-red-900">Nao foi possivel carregar a Visao de Vendas</h2>
          <p className="mt-2 text-xs leading-5 text-red-700">
            Verifique se o backend esta ativo e se o usuario tem acesso ao tenant BHS Demo.
          </p>
        </div>
      </div>
    );
  }

  return (
    <OverviewTemplate
      {...data}
      selectedSegment={branch}
      searchQuery={searchQuery}
      actions={{
        resetFilters: () => {
          clearFilters();
          setPeriod('All');
        },
        selectPeriod: () => undefined,
        toggleCategorySearch: (category) => setSearchQuery(searchQuery === category ? '' : category),
        toggleSegment: (segment) => setBranch(branch === segment ? 'All' : segment),
        toggleClientSearch: (clientFullName) => setSearchQuery(searchQuery === clientFullName ? '' : clientFullName),
      }}
      labels={{
        targetKpiLabel: 'Pedidos',
        targetKpiFormat: 'number',
        categoryTitle: 'Faturamento por Canal',
        categorySubtitle: 'Receita agrupada por canal de venda. Clique na barra para filtrar.',
        categoryTableTitle: 'Desempenho por Canal',
        categoryTableSubtitle: 'Receita por canal dentro dos filtros ativos.',
        segmentTitle: 'Faturamento por Filial',
        segmentSubtitle: 'Concentracao das vendas por filial. Clique para filtrar.',
        segmentCenterLabel: 'Top filiais',
      }}
    />
  );
};
