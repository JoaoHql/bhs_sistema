import React, { useEffect, useState } from 'react';
import type { AdsDashboardSnapshot } from '../../../types';
import { useDashboard } from '../../../store/dashboardStore';
import { loadAdsData } from '../../../services/adsData';
import { MetaAdsTab } from '../components/MetaAdsTab';
import { GoogleAnalyticsTab } from '../components/GoogleAnalyticsTab';

interface AdsViewProps {
  activeTab: string;
}

export const AdsView: React.FC<AdsViewProps> = ({ activeTab }) => {
  const { dataMode } = useDashboard();
  const [snapshot, setSnapshot] = useState<AdsDashboardSnapshot | null>(null);

  useEffect(() => {
    let mounted = true;

    loadAdsData(dataMode).then(data => {
      if (mounted) {
        setSnapshot(data);
      }
    });

    return () => {
      mounted = false;
    };
  }, [dataMode]);

  if (!snapshot) {
    return (
      <div className="bg-white border border-slate-200 rounded-xl p-8 text-sm font-bold text-slate-500">
        Carregando Ads...
      </div>
    );
  }

  return (
    <div key={activeTab} className="animate-fade-in w-full">
      {activeTab === 'meta' && <MetaAdsTab data={snapshot.meta} />}
      {activeTab === 'google-analytics' && <GoogleAnalyticsTab data={snapshot.googleAnalytics} />}
    </div>
  );
};
