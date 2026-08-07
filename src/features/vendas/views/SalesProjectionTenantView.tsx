import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { AlertCircle } from 'lucide-react';
import { useDashboard } from '../../../store/dashboardStore';
import { queryApi } from '../../../services/queryApi';
import type { SalesProjectionResponse } from '../../../types';
import { useTenantData } from '../../../hooks/useTenantData';
import { tenantSessionKey } from '../../../services/tenantDataCache';
import { TenantLoadingState } from '../../../components/shared/TenantLoadingState';
import { buildGelobelSalesProjectionData, SalesProjectionTemplate, type SalesProjectionScenario } from '../../templates/sales-projection';

const DEBOUNCE_MS = 300;

interface Props { screenId: string }

export const SalesProjectionTenantView: React.FC<Props> = ({ screenId }) => {
  const { period, branch, setPeriod, setBranch, setScreenFilterConfig, currentUser, screenRefreshVersion } = useDashboard();
  const [scenario, setScenario] = useState<SalesProjectionScenario>({ quantityGrowthPct: 0, revenueGrowthPct: 0, goalGrowthPct: 0 });
  const [debouncedScenario, setDebouncedScenario] = useState<SalesProjectionScenario>(scenario);
  const debounceTimer = useRef<ReturnType<typeof setTimeout>>(undefined);
  const lastData = useRef<SalesProjectionResponse | undefined>(undefined);
  const sessionKey = tenantSessionKey(currentUser?.client_slug, currentUser?.id);
  const company = branch === 'All' ? undefined : branch;
  const month = /^\d{4}-\d{2}$/.test(period) ? period : undefined;
  const { data, isLoading, error } = useTenantData<SalesProjectionResponse>({
    sessionKey, screenId, resourceId: 'sales-projection',
    params: { month, company, ...debouncedScenario }, refreshVersion: screenRefreshVersion,
    loader: () => queryApi.salesProjection({ screenId, month, company, ...debouncedScenario }),
  });

  if (data) lastData.current = data;
  const displayData = data ?? lastData.current;
  const months = useMemo(() => (displayData?.months ?? []).map((value) => ({ value, label: new Intl.DateTimeFormat('pt-BR', { month: 'long', year: 'numeric', timeZone: 'UTC' }).format(new Date(`${value}-01T00:00:00Z`)) })), [displayData?.months]);
  const companies = useMemo(() => (displayData?.companies ?? []).map((value) => ({ value, label: value })), [displayData?.companies]);

  useEffect(() => {
    setScreenFilterConfig(screenId, { period: { label: 'Mês', options: months, allLabel: 'Mês mais recente' }, branch: { label: 'Empresa', options: companies, allLabel: 'Todas empresas' } });
    return () => setScreenFilterConfig(screenId, null);
  }, [companies, months, screenId, setScreenFilterConfig]);
  useEffect(() => { if (displayData?.month && period === 'All') setPeriod(displayData.month); }, [displayData?.month, period, setPeriod]);
  useEffect(() => { if (branch !== 'All' && companies.length > 0 && !companies.some((item) => item.value === branch)) setBranch('All'); }, [branch, companies, setBranch]);

  const onScenarioChange = useCallback((field: keyof SalesProjectionScenario, value: number) => {
    setScenario((current) => {
      const next = { ...current, [field]: value };
      if (debounceTimer.current) clearTimeout(debounceTimer.current);
      debounceTimer.current = setTimeout(() => {
        setDebouncedScenario(next);
      }, DEBOUNCE_MS);
      return next;
    });
  }, []);

  useEffect(() => {
    return () => { if (debounceTimer.current) clearTimeout(debounceTimer.current); };
  }, []);

  if (!displayData && isLoading) return <TenantLoadingState label="Calculando projeção de vendas..." />;
  if (!displayData && error) return <div className="min-h-[360px] flex items-center justify-center"><div className="max-w-md text-center border border-red-100 bg-red-50 rounded-xl p-6"><AlertCircle className="w-8 h-8 text-red-500 mx-auto mb-3" /><h2 className="text-sm font-bold text-red-900">Não foi possível calcular a projeção</h2><p className="mt-2 text-xs text-red-700">Verifique se a base diária de vendas foi carregada.</p></div></div>;
  if (!displayData) return <TenantLoadingState label="Calculando projeção de vendas..." />;

  return <SalesProjectionTemplate data={buildGelobelSalesProjectionData(displayData, scenario, onScenarioChange, isLoading)} />;
};
