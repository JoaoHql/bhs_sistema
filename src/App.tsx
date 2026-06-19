import { useState } from 'react';
import { DashboardProvider } from './store/dashboardStore';
import { DashboardLayout } from './layouts/DashboardLayout';
import { AnalisesView } from './features/analises/views/AnalisesView';
import { CadastrosView } from './features/cadastros/views/CadastrosView';
import { ConfiguracoesView } from './features/configuracoes/views/ConfiguracoesView';

function DashboardContent() {
  const [currentTab, setCurrentTab] = useState('analises-overview');

  return (
    <DashboardLayout currentTab={currentTab} setCurrentTab={setCurrentTab}>
      {currentTab.startsWith('analises-') && (
        <AnalisesView activeTab={currentTab.replace('analises-', '')} />
      )}
      {currentTab === 'cadastros' && <CadastrosView />}
      {currentTab === 'configuracoes' && <ConfiguracoesView />}
    </DashboardLayout>
  );
}

function App() {
  return (
    <DashboardProvider>
      <DashboardContent />
    </DashboardProvider>
  );
}

export default App;
