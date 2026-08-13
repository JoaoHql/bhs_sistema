import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { AlertCircle } from 'lucide-react';
import { useDashboard } from '../../../store/dashboardStore';
import { queryApi } from '../../../services/queryApi';
import type { SalesProjectionWeeklyResponse } from '../../../types';
import { useTenantData } from '../../../hooks/useTenantData';
import { tenantSessionKey } from '../../../services/tenantDataCache';
import { TenantLoadingState } from '../../../components/shared/TenantLoadingState';
import {
  buildGelobelSalesProjectionWeeklyData,
  SalesProjectionWeeklyTemplate,
  type SalesProjectionScenario,
} from '../../templates/sales-projection-weekly';

const DEBOUNCE_MS = 300;

interface Props { screenId: string }

export const SalesProjectionWeeklyTenantView: React.FC<Props> = ({ screenId }) => {
  const { period, branch, setPeriod, setBranch, setScreenFilterConfig, currentUser, screenRefreshVersion } = useDashboard();
  const [scenario, setScenario] = useState<SalesProjectionScenario>({ quantityGrowthPct: 0, revenueGrowthPct: 0, goalGrowthPct: 0 });
  const [debouncedScenario, setDebouncedScenario] = useState<SalesProjectionScenario>(scenario);
  const debounceTimer = useRef<ReturnType<typeof setTimeout>>(undefined);
  const sessionKey = tenantSessionKey(currentUser?.client_slug, currentUser?.id);
  const company = branch === 'All' ? undefined : branch;
  const month = /^\d{4}-\d{2}$/.test(period) ? period : undefined;
  const { data, isLoading, error } = useTenantData<SalesProjectionWeeklyResponse>({
    sessionKey,
    screenId,
    resourceId: 'sales-projection-weekly',
    params: { month, company, ...debouncedScenario },
    refreshVersion: screenRefreshVersion,
    loader: () => queryApi.salesProjectionWeekly({ screenId, month, company, ...debouncedScenario }),
  });

  const displayData = data;
  const months = useMemo(() => (displayData?.months ?? []).map((value) => ({
    value,
    label: new Intl.DateTimeFormat('pt-BR', { month: 'long', year: 'numeric', timeZone: 'UTC' }).format(new Date(`${value}-01T00:00:00Z`)),
  })), [displayData?.months]);
  const companies = useMemo(() => (displayData?.companies ?? []).map((value) => ({ value, label: value })), [displayData?.companies]);

  useEffect(() => {
    setScreenFilterConfig(screenId, { period: { label: 'Mês', options: months, allLabel: 'Mês mais recente' }, branch: { label: 'Empresa', options: companies, allLabel: 'Todas empresas' } });
    return () => setScreenFilterConfig(screenId, null);
  }, [companies, months, screenId, setScreenFilterConfig]);
  useEffect(() => { if (displayData?.month && !months.some((item) => item.value === period)) setPeriod(displayData.month); }, [displayData?.month, months, period, setPeriod]);
  useEffect(() => { if (branch !== 'All' && companies.length > 0 && !companies.some((item) => item.value === branch)) setBranch('All'); }, [branch, companies, setBranch]);

  const onScenarioChange = useCallback((field: keyof SalesProjectionScenario, value: number) => {
    setScenario((current) => {
      const next = { ...current, [field]: value };
      if (debounceTimer.current) clearTimeout(debounceTimer.current);
      debounceTimer.current = setTimeout(() => setDebouncedScenario(next), DEBOUNCE_MS);
      return next;
    });
  }, []);

  useEffect(() => () => { if (debounceTimer.current) clearTimeout(debounceTimer.current); }, []);

  if (!displayData && isLoading) return <TenantLoadingState label="Calculando projeção semanal..." />;
  if (!displayData && error) return <div className="flex min-h-[360px] items-center justify-center"><div className="max-w-md rounded-xl border border-red-100 bg-red-50 p-6 text-center"><AlertCircle className="mx-auto mb-3 h-8 w-8 text-red-500" /><h2 className="text-sm font-bold text-red-900">Não foi possível carregar a projeção</h2><p className="mt-2 text-xs text-red-700">Verifique se a base diária de vendas foi carregada.</p></div></div>;
  if (!displayData) return <TenantLoadingState label="Calculando projeção semanal..." />;

  const storageKey = `${sessionKey}:${screenId}`;
  return <SalesProjectionWeeklyTemplate data={buildGelobelSalesProjectionWeeklyData(displayData, scenario, onScenarioChange, storageKey, isLoading)} />;
};
