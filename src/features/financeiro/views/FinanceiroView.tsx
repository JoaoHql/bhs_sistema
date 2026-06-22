import React from 'react';
import { ContasPagarTab } from '../components/ContasPagarTab';
import { ContasReceberTab } from '../components/ContasReceberTab';
import { ConciliacaoBancariaTab } from '../components/ConciliacaoBancariaTab';
import { DRETab } from '../components/DRETab';

interface FinanceiroViewProps {
  activeTab: string;
}

export const FinanceiroView: React.FC<FinanceiroViewProps> = ({ activeTab }) => {
  return (
    <div key={activeTab} className="animate-fade-in w-full">
      {activeTab === 'pagar' && <ContasPagarTab />}
      {activeTab === 'receber' && <ContasReceberTab />}
      {activeTab === 'conciliacao' && <ConciliacaoBancariaTab />}
      {activeTab === 'dre' && <DRETab />}
    </div>
  );
};
