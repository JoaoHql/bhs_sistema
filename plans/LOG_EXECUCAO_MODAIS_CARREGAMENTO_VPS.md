# Log de Execução: Modais de Carregamento e Estagiamento Visual com Proteção para VPS

**Data (ISO)**: 2026-08-10

## Escopo Executado

- **Avaliação e Correção de Erros no VPS**:
  - Implementado sistema de retentativa automática (`executeWithRetry`) no `apiClient.ts` com retardo progressivo (exponential backoff, até 3 tentativas) para contornar latências frias de Nginx/uVICORN e desconexões temporárias de rede no boot da VPS.
  - Adicionado sistema de subscrição de tentativas (`subscribeApiRetry`) para alimentar feedbacks visuais na interface caso ocorram reconexões.

- **Modal de Carregamento Inicial com Estagiamento Visual**:
  - Criado o componente [`TenantLoadingModal.tsx`](file:///C:/projetos/bruno/bhs_sistema/Modelo/src/components/shared/TenantLoadingModal.tsx) para o boot inicial da aplicação.
  - Exibe barra animada com gradiente, percentual dinâmico (0% a 100%) e distintivos explícitos das fases: **Início** (0-30%), **Meio** (35-75%) e **Fim** (80-100%).
  - Exibe mensagens contextuais do estado de boot e alertas de reconexão ("Reconectando ao VPS... Tentativa X de 3").

- **Navegação Não-Bloqueante para Interações Secundárias**:
  - Criado o componente [`GlobalTopLoader.tsx`](file:///C:/projetos/bruno/bhs_sistema/Modelo/src/components/shared/GlobalTopLoader.tsx) que exibe uma linha de carregamento brilhante (3px) no topo superior da janela durante trocas de abas e requisições de fundo.
  - Nenhuma interatividade, clique ou rolagem do usuário é bloqueada por modal durante a navegação comum pelas abas do painel.

- **Estaging no Store e Context**:
  - Atualizado [`dashboardStore.tsx`](file:///C:/projetos/bruno/bhs_sistema/Modelo/src/store/dashboardStore.tsx) com o controle de progresso inicial (`configurationProgress`) e mensagens de retry (`retryMessage`).
  - Atualizado [`TenantLoadingState.tsx`](file:///C:/projetos/bruno/bhs_sistema/Modelo/src/components/shared/TenantLoadingState.tsx) para suporte a badges de estágios visuais e porcentagem.

## Arquivos Alterados

1. [`src/services/apiClient.ts`](file:///C:/projetos/bruno/bhs_sistema/Modelo/src/services/apiClient.ts) - Lógica de retry com backoff e eventos de retry.
2. [`src/components/shared/TenantLoadingModal.tsx`](file:///C:/projetos/bruno/bhs_sistema/Modelo/src/components/shared/TenantLoadingModal.tsx) - Componente [NEW] para o modal de carregamento inicial em 3 fases.
3. [`src/components/shared/GlobalTopLoader.tsx`](file:///C:/projetos/bruno/bhs_sistema/Modelo/src/components/shared/GlobalTopLoader.tsx) - Componente [NEW] para barra superior não-bloqueante.
4. [`src/components/shared/TenantLoadingState.tsx`](file:///C:/projetos/bruno/bhs_sistema/Modelo/src/components/shared/TenantLoadingState.tsx) - Suporte a percentual e marcação visual de estágios.
5. [`src/services/tenantDataCache.ts`](file:///C:/projetos/bruno/bhs_sistema/Modelo/src/services/tenantDataCache.ts) - Exposição de contagem global de requisições pendentes.
6. [`src/hooks/useTenantData.ts`](file:///C:/projetos/bruno/bhs_sistema/Modelo/src/hooks/useTenantData.ts) - Novo hook `useGlobalActivity` para escutar requisições ativas.
7. [`src/store/dashboardStore.tsx`](file:///C:/projetos/bruno/bhs_sistema/Modelo/src/store/dashboardStore.tsx) - Gerenciamento de progresso do boot (15%, 50%, 75%, 100%) e retries.
8. [`src/layouts/DashboardLayout.tsx`](file:///C:/projetos/bruno/bhs_sistema/Modelo/src/layouts/DashboardLayout.tsx) - Integração do `GlobalTopLoader`.
9. [`src/App.tsx`](file:///C:/projetos/bruno/bhs_sistema/Modelo/src/App.tsx) - Exibição do `TenantLoadingModal` durante a fase de `configurationStatus === 'loading'`.

## Validação Realizada

- **Build de Produção**: `cmd /c "npm run build"` executado com sucesso (código de saída 0), sem erros de TypeScript ou agrupamento do Vite.
- **Smoke Test de Tenant Gelobel**: Confirmado suporte e integridade das 5 telas essenciais (`Mensagens`, `Disparos no WhatsApp`, `Simuladores`, `Simulador de Combos`, `Configurações`).
