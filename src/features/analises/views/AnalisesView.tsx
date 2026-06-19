import React from 'react';
import { OverviewTab } from '../components/OverviewTab';
import { RFVTab } from '../components/RFVTab';
import { RegionTab } from '../components/RegionTab';
import { PerformanceTab } from '../components/PerformanceTab';

interface AnalisesViewProps {
  activeTab: string;
}

export const AnalisesView: React.FC<AnalisesViewProps> = ({ activeTab }) => {
  return (
    <div key={activeTab} className="animate-fade-in">
      {activeTab === 'overview' && <OverviewTab />}
      {activeTab === 'rfv' && <RFVTab />}
      {activeTab === 'region' && <RegionTab />}
      {activeTab === 'performance' && <PerformanceTab />}
    </div>
  );
};
