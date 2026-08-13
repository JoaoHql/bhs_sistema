import React, { useCallback, useEffect, useMemo } from 'react';
import { AlertCircle } from 'lucide-react';
import { useDashboard } from '../../../store/dashboardStore';
import { queryApi } from '../../../services/queryApi';
import type { ComboSimulatorProductsResponse, SavedComboSimulation } from '../../../types';
import {
  ComboSimulatorTemplate,
  adaptGelobelComboProducts,
  buildGelobelComboSimulationData,
  type ComboProductOption,
} from '../../templates/combo-simulator';
import { useTenantData } from '../../../hooks/useTenantData';
import {
  loadTenantData,
  tenantCacheKey,
  tenantSessionKey,
} from '../../../services/tenantDataCache';
import { TenantLoadingState } from '../../../components/shared/TenantLoadingState';

interface TenantComboSimulatorViewProps {
  screenId: string;
}

export const TenantComboSimulatorView: React.FC<TenantComboSimulatorViewProps> = ({ screenId }) => {
  const { branch, setBranch, setScreenFilterConfig, currentUser, screenRefreshVersion } = useDashboard();
  const sessionKey = tenantSessionKey(currentUser?.client_slug, currentUser?.id);
  const company = branch === 'All' ? undefined : branch;
  const { data: response, isLoading, error } = useTenantData<ComboSimulatorProductsResponse>({
    sessionKey,
    screenId,
    resourceId: 'combo-catalog',
    params: { company, limit: 80 },
    refreshVersion: screenRefreshVersion,
    loader: () => queryApi.comboSimulatorProducts({ screenId, company, limit: 80 }),
  });
  const rows = useMemo(() => response?.rows ?? [], [response]);
  const companies = useMemo(() => response?.companies ?? [], [response]);
  const { data: savedSimulations = [] } = useTenantData<SavedComboSimulation[]>({
    sessionKey,
    screenId,
    resourceId: 'combo-simulations',
    params: { company: company ?? '' },
    refreshVersion: screenRefreshVersion,
    loader: () => company ? queryApi.comboSimulations({ screenId, company }) : Promise.resolve([]),
  });

  const loadProducts = useCallback(async (search: string): Promise<ComboProductOption[]> => {
    if (!company) return [];

    const key = tenantCacheKey(sessionKey, screenId, 'combo-search', { search, company, limit: 80 });
    const searchResponse = await loadTenantData(key, () => queryApi.comboSimulatorProducts({
      screenId,
      search,
      company,
      limit: 80,
    }));
    return adaptGelobelComboProducts(searchResponse.rows, company);
  }, [company, screenId, sessionKey]);

  const companyOptions = useMemo(
    () => companies.map((company) => ({ value: company, label: company })),
    [companies],
  );

  useEffect(() => {
    setScreenFilterConfig(screenId, {
      branch: {
        label: 'Empresa',
        allowAll: false,
        options: companyOptions,
      },
    });

    return () => setScreenFilterConfig(screenId, null);
  }, [companyOptions, screenId, setScreenFilterConfig]);

  useEffect(() => {
    if (companyOptions.length > 0 && !companyOptions.some((option) => option.value === branch)) {
      setBranch(companyOptions[0].value);
    }
  }, [branch, companyOptions, setBranch]);

  const hasValidCompany = companyOptions.some((option) => option.value === company);
  const createSavedSimulation = useCallback(async (input: {
    name: string;
    products: SavedComboSimulation['products'];
  }) => {
    if (!company) throw new Error('Empresa nao selecionada.');
    return queryApi.createComboSimulation({ screenId, company, ...input });
  }, [company, screenId]);

  const deleteSavedSimulation = useCallback(async (id: string) => {
    if (!company) throw new Error('Empresa nao selecionada.');
    await queryApi.deleteComboSimulation({ screenId, company, id });
  }, [company, screenId]);

  const data = useMemo(
    () => ({
      ...buildGelobelComboSimulationData(rows, company ?? '', loadProducts),
      persistence: {
        savedSimulations,
        createSavedSimulation,
        deleteSavedSimulation,
      },
    }),
    [company, createSavedSimulation, deleteSavedSimulation, loadProducts, rows, savedSimulations],
  );

  if (isLoading || (companies.length > 0 && !hasValidCompany)) {
    return <TenantLoadingState label="Carregando catálogo de produtos..." />;
  }

  if (error || data.initialProducts.length < 3) {
    return (
      <div className="min-h-[360px] flex items-center justify-center">
        <div className="max-w-md text-center border border-red-100 bg-red-50 rounded-xl p-6">
          <AlertCircle className="w-8 h-8 text-red-500 mx-auto mb-3" />
          <h2 className="text-sm font-bold text-red-900">Nao foi possivel preparar o Simulador de Combos</h2>
          <p className="mt-2 text-xs leading-5 text-red-700">
            A tela precisa de ao menos tres produtos ativos com preco de referencia.
          </p>
        </div>
      </div>
    );
  }

  return <ComboSimulatorTemplate key={company} data={data} />;
};
