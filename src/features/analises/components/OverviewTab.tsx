import React, { useMemo } from 'react';
import { useDashboard } from '../../../store/dashboardStore';
import { buildMockOverviewData, OverviewTemplate } from '../../templates/overview';

export const OverviewTab: React.FC = () => {
  const {
    filteredCustomers,
    filteredMetas,
    region,
    setRegion,
    setBranch,
    setCluster,
    searchQuery,
    setSearchQuery,
    setPeriod,
  } = useDashboard();

  const overviewData = useMemo(
    () => buildMockOverviewData({ customers: filteredCustomers, metas: filteredMetas }),
    [filteredCustomers, filteredMetas],
  );

  return (
    <OverviewTemplate
      kpis={overviewData.kpis}
      trendData={overviewData.trendData}
      categoryData={overviewData.categoryData}
      segmentData={overviewData.segmentData}
      topClients={overviewData.topClients}
      selectedSegment={region}
      searchQuery={searchQuery}
      actions={{
        resetFilters: () => {
          setRegion('All');
          setCluster('All');
          setBranch('All');
          setSearchQuery('');
        },
        selectPeriod: (period) => setPeriod(`${period}/2026`),
        toggleCategorySearch: (category) => setSearchQuery(searchQuery === category ? '' : category),
        toggleSegment: (segment) => setRegion(region === segment ? 'All' : segment),
        toggleClientSearch: (clientFullName) => setSearchQuery(searchQuery === clientFullName ? '' : clientFullName),
      }}
    />
  );
};
