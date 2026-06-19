import React from 'react';
import { CombosSimulatorTab } from '../components/CombosSimulatorTab';

interface SimuladoresViewProps {
  activeTab: string;
}

export const SimuladoresView: React.FC<SimuladoresViewProps> = ({ activeTab }) => {
  return (
    <div key={activeTab} className="animate-fade-in h-full flex flex-col">
      {activeTab === 'combos' && <CombosSimulatorTab />}
    </div>
  );
};
