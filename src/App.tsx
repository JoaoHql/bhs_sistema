import { lazy, Suspense } from 'react';
import { DashboardProvider, useDashboard } from './store/dashboardStore';
import { DashboardLayout } from './layouts/DashboardLayout';
import { LoginScreen } from './components/LoginScreen';
import { MandatoryPasswordChangeScreen } from './components/MandatoryPasswordChangeScreen';
import { isStaffLibraryScreenEnabled } from './config/staffLibrary';
import { TenantLoadingState } from './components/shared/TenantLoadingState';

const AnalisesView = lazy(() => import('./features/analises/views/AnalisesView').then(module => ({ default: module.AnalisesView })));
const CadastrosView = lazy(() => import('./features/cadastros/views/CadastrosView').then(module => ({ default: module.CadastrosView })));
const WorkspaceDadosView = lazy(() => import('./features/cadastros/views/WorkspaceDadosView').then(module => ({ default: module.WorkspaceDadosView })));
const DynamicCanvasView = lazy(() => import('./features/cadastros/views/DynamicCanvasView').then(module => ({ default: module.DynamicCanvasView })));
const ConfiguracoesView = lazy(() => import('./features/configuracoes/views/ConfiguracoesView').then(module => ({ default: module.ConfiguracoesView })));
const SimuladoresView = lazy(() => import('./features/simuladores/views/SimuladoresView').then(module => ({ default: module.SimuladoresView })));
const FinanceiroView = lazy(() => import('./features/financeiro/views/FinanceiroView').then(module => ({ default: module.FinanceiroView })));
const AgenteView = lazy(() => import('./features/agente/views/AgenteView').then(module => ({ default: module.AgenteView })));
const AdsView = lazy(() => import('./features/ads/views/AdsView').then(module => ({ default: module.AdsView })));
const SalesOverviewTenantView = lazy(() => import('./features/vendas/views/SalesOverviewTenantView').then(module => ({ default: module.SalesOverviewTenantView })));
const TenantComboSimulatorView = lazy(() => import('./features/simuladores/views/TenantComboSimulatorView').then(module => ({ default: module.TenantComboSimulatorView })));
const SalesProjectionTenantView = lazy(() => import('./features/vendas/views/SalesProjectionTenantView').then(module => ({ default: module.SalesProjectionTenantView })));
const MensagensView = lazy(() => import('./features/mensagens/views/MensagensView').then(module => ({ default: module.MensagensView })));

function EmptyTenantView() {
  return (
    <div className="min-h-[360px] flex items-center justify-center">
      <div className="max-w-xl text-center">
        <div className="mx-auto mb-4 h-12 w-12 rounded-full bg-slate-100 border border-slate-200 flex items-center justify-center text-slate-500">
          BI
        </div>
        <h1 className="text-xl font-bold text-slate-900">Nenhuma tela publicada para este cliente</h1>
        <p className="mt-2 text-sm text-slate-500 leading-6">
          Este usuario esta conectado ao ambiente real. A equipe BHS precisa configurar o schema, montar as telas e publicar a versao do tenant.
        </p>
      </div>
    </div>
  );
}

function DashboardContent() {
  const { currentTab, setCurrentTab, currentUser, userModules } = useDashboard();

  if (!currentUser) {
    return <LoginScreen />;
  }

  if (currentUser.must_change_password) {
    return <MandatoryPasswordChangeScreen />;
  }

  const isStaff = !!currentUser.is_staff;
  const isTenantMaster = !isStaff && currentUser.roles.includes('admin');
  const dynamicScreenIds = new Set((isStaff ? [] : userModules).flatMap(module => module.screens.map(screen => screen.id)).filter((screenId) => screenId !== 'configuracoes'));
  const canRenderDynamicScreen = currentTab !== '' && dynamicScreenIds.has(currentTab);

  return (
    <DashboardLayout currentTab={currentTab} setCurrentTab={setCurrentTab}>
      <Suspense fallback={<TenantLoadingState label="Carregando tela..." />}>
      {isStaff && isStaffLibraryScreenEnabled(currentTab) && currentTab.startsWith('analises-') && (
        <AnalisesView activeTab={currentTab.replace('analises-', '')} />
      )}
      {isStaff && isStaffLibraryScreenEnabled(currentTab) && currentTab.startsWith('financeiro-') && (
        <FinanceiroView activeTab={currentTab.replace('financeiro-', '')} />
      )}
      {isStaff && isStaffLibraryScreenEnabled(currentTab) && currentTab.startsWith('ads-') && (
        <AdsView activeTab={currentTab.replace('ads-', '')} />
      )}
      {isStaff && isStaffLibraryScreenEnabled(currentTab) && currentTab.startsWith('simuladores-') && (
        <SimuladoresView activeTab={currentTab.replace('simuladores-', '')} />
      )}
      {isStaff && isStaffLibraryScreenEnabled('agente') && currentTab === 'agente' && <AgenteView />}
      {isStaff && isStaffLibraryScreenEnabled('mensagens-disparos-whatsapp') && currentTab === 'mensagens-disparos-whatsapp' && <MensagensView />}
      {isStaff && isStaffLibraryScreenEnabled('cadastros') && currentTab === 'cadastros' && <CadastrosView />}
      {isStaff && isStaffLibraryScreenEnabled('workspace-dados') && currentTab === 'workspace-dados' && <WorkspaceDadosView />}
      {isStaff && isStaffLibraryScreenEnabled('configuracoes') && currentTab === 'configuracoes' && <ConfiguracoesView />}
      {isTenantMaster && currentTab === 'configuracoes' && <ConfiguracoesView clientOnly />}

      {canRenderDynamicScreen && currentTab === 'demo-vendas' && (
        <SalesOverviewTenantView screenId={currentTab} />
      )}

      {canRenderDynamicScreen && currentTab === 'simulador-combos' && (
        <TenantComboSimulatorView screenId={currentTab} />
      )}

      {canRenderDynamicScreen && currentTab === 'projecao-vendas' && (
        <SalesProjectionTenantView screenId={currentTab} />
      )}

      {canRenderDynamicScreen && currentTab === 'mensagens-disparos-whatsapp' && (
        <MensagensView />
      )}

      {canRenderDynamicScreen && currentTab !== 'demo-vendas' && currentTab !== 'simulador-combos' && currentTab !== 'projecao-vendas' && currentTab !== 'mensagens-disparos-whatsapp' && (
        <DynamicCanvasView screenId={currentTab} />
      )}

      {!isStaff && !canRenderDynamicScreen && currentTab !== 'configuracoes' && <EmptyTenantView />}
      </Suspense>
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
