import React from 'react';
import { OverviewTab } from '../components/OverviewTab';
import { RFVTab } from '../components/RFVTab';
import { RegionTab } from '../components/RegionTab';
import { PerformanceTab } from '../components/PerformanceTab';
import { MapaTab } from '../components/MapaTab';
import { ShopeeTab } from '../components/ShopeeTab';
import { MercadoLivreTab } from '../components/MercadoLivreTab';
import { IFoodTab } from '../components/IFoodTab';

interface AnalisesViewProps {
  activeTab: string;
}

export const AnalisesView: React.FC<AnalisesViewProps> = ({ activeTab }) => {
  return (
    <div key={activeTab} className="animate-fade-in h-full flex flex-col">
      {activeTab === 'overview' && <OverviewTab />}
      {activeTab === 'shopee' && <ShopeeTab />}
      {activeTab === 'mercadolivre' && <MercadoLivreTab />}
      {activeTab === 'ifood' && <IFoodTab />}
      {activeTab === 'rfv' && <RFVTab />}
      {activeTab === 'region' && <RegionTab />}
      {activeTab === 'performance' && <PerformanceTab />}
      {activeTab === 'mapa' && <MapaTab />}
    </div>
  );
};
