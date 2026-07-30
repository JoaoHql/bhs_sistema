import React, { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import type { Customer, DataMode, DataStatus, Meta, RFVCluster, SyncLog, User, WorkspaceSource, FieldDataType, WorkspaceField, WorkspaceType, ConnectionParams, ChartConfig, AppModule, CalculatedField, QueryFilterValue, BackendUser, AppScreen, ScreenFilterConfig } from '../types';

import { getInitialDataMode, loadDashboardData, persistDataMode, syncDashboardData } from '../services/dashboardData';
import { configApi, isConfigApiEnabled } from '../services/configApi';
import { invalidateTenantScreen, tenantSessionKey } from '../services/tenantDataCache';

interface DashboardContextType {
  dataMode: DataMode;
  setDataMode: (mode: DataMode) => void;
  dataStatus: DataStatus;
  dataStatusMessage: string;
  
  // Navigation State
  currentTab: string;
  setCurrentTab: (tab: string) => void;
  screenRefreshVersion: number;

  // Filter States
  period: string;
  branch: string;
  region: string;
  cluster: RFVCluster | 'All';
  searchQuery: string;
  screenFilterConfigs: Record<string, ScreenFilterConfig>;
  
  // Setters
  setPeriod: (period: string) => void;
  setBranch: (branch: string) => void;
  setRegion: (region: string) => void;
  setCluster: (cluster: RFVCluster | 'All') => void;
  setSearchQuery: (query: string) => void;
  setScreenFilterConfig: (screenId: string, config: ScreenFilterConfig | null) => void;
  clearFilters: () => void;
  
  // Data States
  customers: Customer[];
  metas: Meta[];
  users: User[];
  syncLogs: SyncLog[];
  isSyncing: boolean;
  lastUpdated: string;
  
  // Workspaces Data
  workspaces: WorkspaceSource[];
  toggleWorkspaceActive: (id: string) => void;
  updateWorkspaceField: (workspaceId: string, fieldName: string, type: FieldDataType, description: string) => void;
  addWorkspace: (name: string, type: WorkspaceType, conn: string, fields: WorkspaceField[]) => void;
  updateWorkspaceConnectionParams: (workspaceId: string, params: ConnectionParams) => void;
  queryWorkspaceData: (config: ChartConfig) => any[];
  getWorkspaceRawData: (workspaceId: string) => any[];
  getBackendFilters: () => Record<string, QueryFilterValue>;

  // Calculoteca Dinâmica
  calculatedFields: CalculatedField[];
  addCalculatedField: (field: CalculatedField) => void;
  removeCalculatedField: (id: string) => void;
  
  // Dynamic App Shell Modules
  userModules: AppModule[];
  addUserModule: (mod: AppModule) => void;
  removeUserModule: (id: string) => void;
  updateUserModules: (mods: AppModule[]) => void;
  userMenuOrder: string[];
  setUserMenuOrder: (order: string[]) => void;
  
  // Admin & Preview State
  currentUser: BackendUser | null;
  setCurrentUser: (user: BackendUser | null) => void;
  previewMode: boolean;
  setPreviewMode: (mode: boolean) => void;
  previewConfig: { modules: AppModule[]; screens: AppScreen[] } | null;
  setPreviewConfig: (config: { modules: AppModule[]; screens: AppScreen[] } | null) => void;
  
  // Ask AI Drawer State

  isAskDrawerOpen: boolean;
  setIsAskDrawerOpen: (open: boolean) => void;
  
  // Toast Notification State
  activeToast: { message: string; actionText?: string; onAction?: () => void; id: number } | null;
  showToast: (message: string, actionText?: string, onAction?: () => void) => void;
  clearToast: () => void;
  
  // Mutators
  addMeta: (meta: Omit<Meta, 'id'>) => void;
  updateMeta: (meta: Meta) => void;
  deleteMeta: (id: string) => void;
  updateUserPermission: (userId: string, screen: string, access: 'None' | 'Read' | 'Write') => void;
  syncNow: () => Promise<void>;
  
  // Filtered Computed Data
  filteredCustomers: Customer[];
  filteredMetas: Meta[];
}

const RAW_DATABASE: Record<string, any[]> = {
  'ws-1': [ // unificado_lancamento_cc.csv (Sales)
    { id_venda: 'VND-001', data_lancamento: '2026-06-01', valor_liquido: 12500.00, categoria_venda: 'Software Licenças', filial: 'Filial Sul' },
    { id_venda: 'VND-002', data_lancamento: '2026-06-02', valor_liquido: 23000.00, categoria_venda: 'Consultoria Integrada', filial: 'Filial Sudeste' },
    { id_venda: 'VND-003', data_lancamento: '2026-06-05', valor_liquido: 9500.00, categoria_venda: 'Suporte & SLA', filial: 'Filial Nordeste' },
    { id_venda: 'VND-004', data_lancamento: '2026-06-10', valor_liquido: 45000.00, categoria_venda: 'Software Licenças', filial: 'Filial Sudeste' },
    { id_venda: 'VND-005', data_lancamento: '2026-06-12', valor_liquido: 18000.00, categoria_venda: 'Consultoria Integrada', filial: 'Filial Sul' },
    { id_venda: 'VND-006', data_lancamento: '2026-06-15', valor_liquido: 8500.00, categoria_venda: 'Suporte & SLA', filial: 'Filial Sudeste' },
    { id_venda: 'VND-007', data_lancamento: '2026-06-20', valor_liquido: 32000.00, categoria_venda: 'Hardware Infrainstr.', filial: 'Filial Nordeste' },
    { id_venda: 'VND-008', data_lancamento: '2026-06-25', valor_liquido: 15000.00, categoria_venda: 'Software Licenças', filial: 'Filial Sul' }
  ],
  'ws-2': [ // vendas_shopee_2026.db (Shopee)
    { pedido_id: 'SHP-001', data_criacao: '2026-06-01', valor_pago: 159.90, status_pedido: 'Enviado', frete: 12.00, filial: 'Filial Sudeste' },
    { pedido_id: 'SHP-002', data_criacao: '2026-06-05', valor_pago: 249.00, status_pedido: 'Entregue', frete: 15.00, filial: 'Filial Sul' },
    { pedido_id: 'SHP-003', data_criacao: '2026-06-10', valor_pago: 89.90, status_pedido: 'Enviado', frete: 8.00, filial: 'Filial Nordeste' },
    { pedido_id: 'SHP-004', data_criacao: '2026-06-15', valor_pago: 399.00, status_pedido: 'Cancelado', frete: 20.00, filial: 'Filial Sudeste' },
    { pedido_id: 'SHP-005', data_criacao: '2026-06-20', valor_pago: 129.90, status_pedido: 'Entregue', frete: 10.00, filial: 'Filial Sul' }
  ],
  'ws-3': [ // clientes_rfv_crm.xlsx (CRM Clientes)
    { cliente_id: 'CLI-101', nome_cliente: 'Tech Solutions', recencia_dias: 5, frequencia_compras: 20, total_gasto: 180000.00, cluster_segmento: 'Champions' },
    { cliente_id: 'CLI-102', nome_cliente: 'Nova Indústria', recencia_dias: 12, frequencia_compras: 10, total_gasto: 95000.00, cluster_segmento: 'Loyal' },
    { cliente_id: 'CLI-103', nome_cliente: 'Global Trade', recencia_dias: 75, frequencia_compras: 8, total_gasto: 110000.00, cluster_segmento: 'At Risk' },
    { cliente_id: 'CLI-104', nome_cliente: 'Alpha Consultoria', recencia_dias: 150, frequencia_compras: 2, total_gasto: 15000.00, cluster_segmento: 'About to Sleep' },
    { cliente_id: 'CLI-105', nome_cliente: 'Beta Sistemas', recencia_dias: 2, frequencia_compras: 1, total_gasto: 5000.00, cluster_segmento: 'New' }
  ],
  'ws-4': [ // dre_consolidado_api (DRE API)
    { mes_ano: '01/2026', receita_bruta: 2100000, deducoes: 310000, custos_operacionais: 1600000, ebitda: 390000, lucro_liquido: 270000 },
    { mes_ano: '02/2026', receita_bruta: 2200000, deducoes: 330000, custos_operacionais: 1650000, ebitda: 410000, lucro_liquido: 285000 },
    { mes_ano: '03/2026', receita_bruta: 2050000, deducoes: 290000, custos_operacionais: 1580000, ebitda: 370000, lucro_liquido: 260000 },
    { mes_ano: '04/2026', receita_bruta: 2300000, deducoes: 350000, custos_operacionais: 1720000, ebitda: 430000, lucro_liquido: 300000 },
    { mes_ano: '05/2026', receita_bruta: 2400000, deducoes: 370000, custos_operacionais: 1810000, ebitda: 450000, lucro_liquido: 315000 },
    { mes_ano: '06/2026', receita_bruta: 2450000, deducoes: 380000, custos_operacionais: 1890000, ebitda: 438450, lucro_liquido: 310000 }
  ]
};

const DashboardContext = createContext<DashboardContextType | undefined>(undefined);

const initialWorkspaces: WorkspaceSource[] = [
  {
    id: 'ws-1',
    name: 'Texto/CSV',
    type: 'csv',
    fileNameOrConn: 'unificado_lancamento_cc.csv',
    gatewayStatus: 'connected',
    lastSynced: 'Hoje às 10:30',
    isActiveForAgent: true,
    fields: [
      { name: 'id_venda', type: 'Text', description: 'Identificador único da venda ou transação.', example: 'VND-98402' },
      { name: 'data_lancamento', type: 'Date', description: 'Data em que a transação foi registrada no sistema financeiro.', example: '2026-06-28' },
      { name: 'valor_liquido', type: 'Currency', description: 'Valor líquido da venda após impostos e deduções operacionais.', example: 'R$ 1.250,00' },
      { name: 'categoria_venda', type: 'Category', description: 'Categoria de classificação do item vendido (ex: Software Licenças).', example: 'Software Licenças' },
      { name: 'filial', type: 'Text', description: 'Nome da filial de origem da venda (ex: Filial Sul).', example: 'Filial Sul' }
    ]
  },
  {
    id: 'ws-2',
    name: 'Banco de Dados',
    type: 'sqlite',
    fileNameOrConn: 'vendas_shopee_2026.db',
    gatewayStatus: 'connected',
    lastSynced: 'Ontem às 18:15',
    isActiveForAgent: true,
    fields: [
      { name: 'pedido_id', type: 'Text', description: 'Código identificador do pedido gerado pela plataforma Shopee.', example: '260630SHP001' },
      { name: 'data_criacao', type: 'Date', description: 'Data de criação e pagamento do pedido na Shopee.', example: '2026-06-30' },
      { name: 'valor_pago', type: 'Currency', description: 'Valor total pago pelo cliente final na plataforma.', example: 'R$ 159,90' },
      { name: 'status_pedido', type: 'Category', description: 'Status atual do pedido (ex: Enviado, Entregue, Cancelado).', example: 'Enviado' },
      { name: 'frete', type: 'Number', description: 'Valor pago pelo frete da entrega.', example: 'R$ 12,00' }
    ],
    connectionParams: {
      host: '192.168.1.50',
      port: '3306',
      databaseName: 'shopee_vendas_db',
      username: 'shopee_bi_user',
      password: 'shopeePassword123',
      timeout: 30
    }
  },
  {
    id: 'ws-3',
    name: 'Planilha Excel',
    type: 'excel',
    fileNameOrConn: 'clientes_rfv_crm.xlsx',
    gatewayStatus: 'connected',
    lastSynced: 'Há 3 dias',
    isActiveForAgent: false,
    fields: [
      { name: 'cliente_id', type: 'Text', description: 'Código único do cliente no sistema CRM de relacionamento.', example: 'CLI-1001' },
      { name: 'nome_cliente', type: 'Text', description: 'Razão social ou nome fantasia da empresa cliente.', example: 'Tech Solutions Ltda' },
      { name: 'recencia_dias', type: 'Number', description: 'Quantidade de dias corridos desde a última compra efetuada.', example: '14' },
      { name: 'frequencia_compras', type: 'Number', description: 'Frequência (quantidade total) de compras no período analisado.', example: '8' },
      { name: 'total_gasto', type: 'Currency', description: 'Volume total acumulado de faturamento deste cliente.', example: 'R$ 45.300,00' },
      { name: 'cluster_segmento', type: 'Category', description: 'Classificação RFV do cliente (ex: Champions, Loyal, At Risk).', example: 'Champions' }
    ]
  },
  {
    id: 'ws-4',
    name: 'Integração API',
    type: 'api',
    fileNameOrConn: 'https://api.financeiro.bhs/v1/dre',
    gatewayStatus: 'maintenance',
    lastSynced: 'Há 1 semana',
    isActiveForAgent: false,
    fields: [
      { name: 'mes_ano', type: 'Date', description: 'Mês e ano de referência consolidada do DRE (MM/AAAA).', example: '06/2026' },
      { name: 'receita_bruta', type: 'Currency', description: 'Faturamento bruto da empresa antes de impostos e devoluções.', example: 'R$ 2.450.000,00' },
      { name: 'deducoes', type: 'Currency', description: 'Deduções totais (impostos, devoluções, abatimentos).', example: 'R$ 380.000,00' },
      { name: 'custos_operacionais', type: 'Currency', description: 'Custos operacionais totais, despesas fixas e variáveis.', example: 'R$ 1.890.000,00' },
      { name: 'ebitda', type: 'Currency', description: 'Lucro antes de juros, impostos, depreciação e amortização.', example: 'R$ 438.450,00' },
      { name: 'lucro_liquido', type: 'Currency', description: 'Resultado financeiro líquido final do período.', example: 'R$ 310.000,00' }
    ],
    connectionParams: {
      url: 'https://api.financeiro.bhs/v1/dre',
      authType: 'bearer',
      authToken: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiJiaHMtYmkiLCJpYXQiOjE3MTk3NjMyMDB9',
      refreshInterval: 'daily'
    }
  }
];

const initialModules: AppModule[] = [
  {
    id: 'mod-base-dados',
    label: 'Base de Dados',
    icon: 'Database',
    screens: [
      {
        id: 'workspace-dados',
        label: 'Workspace de Dados',
        layout: 'canvas',
        components: []
      }
    ]
  }
];

export const DashboardProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [dataMode, setDataModeState] = useState<DataMode>(() => isConfigApiEnabled() ? 'api' : getInitialDataMode());
  const [dataStatus, setDataStatus] = useState<DataStatus>('loading');
  const [dataStatusMessage, setDataStatusMessage] = useState<string>('Carregando dados...');
  const [currentTab, setCurrentTab] = useState<string>(() => isConfigApiEnabled() ? '' : 'analises-overview');
  const [screenRefreshVersion, setScreenRefreshVersion] = useState(0);
  const [workspaces, setWorkspaces] = useState<WorkspaceSource[]>(initialWorkspaces);
  
  // Admin & Preview State
  const [currentUser, setCurrentUser] = useState<BackendUser | null>(() => {
    if (!isConfigApiEnabled()) {
      return {
        id: 'usr_demo_admin',
        email: 'admin@bhs.demo',
        name: 'Administrador Demo',
        client_id: 'cli_bhs_demo',
        roles: ['admin'],
        allowed_screen_ids: ['*'],
        is_staff: true,
        level: 'team'
      };
    }
    return null;
  });
  const [previewMode, setPreviewMode] = useState<boolean>(false);
  const [previewConfig, setPreviewConfig] = useState<{ modules: AppModule[]; screens: AppScreen[] } | null>(null);
  
  const [publishedModules, setPublishedModules] = useState<AppModule[]>(() => isConfigApiEnabled() ? [] : initialModules);
  const [userMenuOrder, setUserMenuOrder] = useState<string[]>([]);
  
  const userModules = useMemo(() => {
    if (currentUser?.is_staff) {
      return [];
    }
    if (previewMode && previewConfig) {
      return previewConfig.modules;
    }
    return publishedModules;
  }, [previewMode, previewConfig, publishedModules]);

  const [isAskDrawerOpen, setIsAskDrawerOpen] = useState<boolean>(false);
  const [activeToast, setActiveToast] = useState<{ message: string; actionText?: string; onAction?: () => void; id: number } | null>(null);

  const pickInitialTab = useCallback((user: BackendUser | null, modules: AppModule[]) => {
    if (!isConfigApiEnabled()) return 'analises-overview';
    if (user?.is_staff) return 'configuracoes';
    if (user?.roles.includes('admin')) return 'configuracoes';
    return modules.flatMap(module => module.screens)[0]?.id ?? '';
  }, []);

  const addUserModule = (newMod: AppModule) => {
    if (newMod.newCalculatedFields && Array.isArray(newMod.newCalculatedFields)) {
      newMod.newCalculatedFields.forEach(field => {
        setCalculatedFields(prev => {
          if (prev.some(f => f.id === field.id)) return prev;
          return [...prev, field];
        });
      });
    }
    setPublishedModules(prev => {
      // Avoid duplicates
      if (prev.some(m => m.id === newMod.id)) return prev;
      return [...prev, newMod];
    });
  };

  const removeUserModule = (id: string) => {
    setPublishedModules(prev => prev.filter(m => m.id !== id));
  };

  const updateUserModules = (mods: AppModule[]) => {
    setPublishedModules(mods);
  };


  const showToast = (message: string, actionText?: string, onAction?: () => void) => {
    const id = Date.now();
    setActiveToast({ message, actionText, onAction, id });
    setTimeout(() => {
      setActiveToast(current => current?.id === id ? null : current);
    }, 6000);
  };

  const clearToast = () => {
    setActiveToast(null);
  };

  const toggleWorkspaceActive = (id: string) => {
    setWorkspaces(prev => prev.map(w => w.id === id ? { ...w, isActiveForAgent: !w.isActiveForAgent } : w));
  };

  const updateWorkspaceField = (workspaceId: string, fieldName: string, type: FieldDataType, description: string) => {
    setWorkspaces(prev => prev.map(w => {
      if (w.id !== workspaceId) return w;
      const fields = w.fields.map(f => f.name === fieldName ? { ...f, type, description } : f);
      return { ...w, fields };
    }));
  };

  const addWorkspace = (name: string, type: WorkspaceType, conn: string, fields: WorkspaceField[]) => {
    const typeLabel = 
      type === 'csv' ? 'Texto/CSV' : 
      type === 'sqlite' ? 'Banco de Dados' : 
      type === 'excel' ? 'Planilha Excel' : 
      type === 'api' ? 'Integração API' : 'SQL Server';

    const newWs: WorkspaceSource = {
      id: `ws-${workspaces.length + 1}`,
      name: typeLabel,
      type,
      fileNameOrConn: conn || `${name.toLowerCase().replace(/\s+/g, '_')}.${type}`,
      gatewayStatus: 'connected',
      lastSynced: 'Agora mesmo',
      isActiveForAgent: false,
      fields,
      connectionParams: type === 'api' 
        ? { url: conn, authType: 'none', refreshInterval: 'hourly' } 
        : type === 'sqlite' || type === 'sqlserver' 
        ? { host: 'localhost', port: type === 'sqlite' ? '' : '1433', databaseName: 'db_nova', timeout: 30 } 
        : undefined
    };
    setWorkspaces(prev => [...prev, newWs]);
  };

  const updateWorkspaceConnectionParams = (workspaceId: string, params: ConnectionParams) => {
    setWorkspaces(prev => prev.map(w => w.id === workspaceId ? { ...w, connectionParams: params } : w));
  };

  const queryWorkspaceData = (config: ChartConfig): any[] => {
    let rawData = RAW_DATABASE[config.workspaceId] || [];
    if (rawData.length === 0) return [];

    // Apply Global Filters dynamically
    rawData = rawData.filter(row => {
      // 1. Filter by Branch (Filial)
      if (branch !== 'All' && row.filial) {
        const rowFilial = String(row.filial).toLowerCase();
        const filterBranch = branch.toLowerCase();
        if (!rowFilial.includes(filterBranch) && !filterBranch.includes(rowFilial)) {
          return false;
        }
      }

      // 2. Filter by Region (mapped to Filial / Região)
      if (region !== 'All') {
        const rowFilial = String(row.filial || '').toLowerCase();
        const rowRegion = String(row.region || '').toLowerCase();
        const filterRegion = region.toLowerCase();
        if (!rowFilial.includes(filterRegion) && !rowRegion.includes(filterRegion)) {
          return false;
        }
      }

      // 3. Filter by RFV Cluster
      if (cluster !== 'All') {
        const rowCluster = String(row.cluster_segment || row.cluster_rfv || '').toLowerCase();
        const filterCluster = cluster.toLowerCase();
        if (rowCluster && !rowCluster.includes(filterCluster) && !filterCluster.includes(rowCluster)) {
          return false;
        }
      }

      // 4. Filter by searchQuery
      if (searchQuery) {
        const query = searchQuery.toLowerCase();
        const matches = Object.values(row).some(val => 
          String(val ?? '').toLowerCase().includes(query)
        );
        if (!matches) return false;
      }

      return true;
    });

    if (rawData.length === 0) return [];

    const dimensionFields = config.dimensions.map(d => d.field);
    const metricConfigs = config.metrics;

    const groups: Record<string, { keyValues: Record<string, any>; rows: any[] }> = {};

    rawData.forEach(row => {
      const keyParts = dimensionFields.map(field => String(row[field] ?? 'Outros'));
      const groupKey = keyParts.join(' - ');

      if (!groups[groupKey]) {
        const keyValues: Record<string, any> = {};
        config.dimensions.forEach(d => {
          keyValues[d.field] = row[d.field] ?? 'Outros';
        });

        groups[groupKey] = {
          keyValues,
          rows: []
        };
      }
      groups[groupKey].rows.push(row);
    });

    const result = Object.values(groups).map(g => {
      const outputRow: Record<string, any> = { ...g.keyValues };

      metricConfigs.forEach(m => {
        const values = g.rows.map(r => {
          const calcDef = calculatedFields.find(cf => cf.id === m.field);
          if (calcDef) {
            const rawVal = Number(r[calcDef.sourceField] ?? 0);
            const expr = calcDef.expression.trim();
            if (expr.startsWith('*')) {
              const parts = expr.split('+');
              const multiplier = Number(parts[0].replace('*', '').trim());
              const adder = parts[1] ? Number(parts[1].trim()) : 0;
              return rawVal * multiplier + adder;
            }
            if (expr.startsWith('+')) {
              return rawVal + Number(expr.replace('+', '').trim());
            }
            return rawVal;
          }
          return Number(r[m.field] ?? 0);
        });

        let aggregatedValue = 0;

        if (m.aggregation === 'sum') {
          aggregatedValue = values.reduce((sum, v) => sum + v, 0);
        } else if (m.aggregation === 'count') {
          aggregatedValue = g.rows.length;
        } else if (m.aggregation === 'avg') {
          const sum = values.reduce((sum, v) => sum + v, 0);
          aggregatedValue = g.rows.length > 0 ? sum / g.rows.length : 0;
        }

        outputRow[m.label] = aggregatedValue;
      });

      return outputRow;
    });

    return result;
  };

  const getWorkspaceRawData = (workspaceId: string): any[] => {
    return RAW_DATABASE[workspaceId] || [];
  };

  // State for filters
  const [period, setPeriod] = useState<string>('Jun/2026');
  const [branch, setBranch] = useState<string>('All');
  const [region, setRegion] = useState<string>('All');
  const [cluster, setCluster] = useState<RFVCluster | 'All'>('All');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [screenFilterConfigs, setScreenFilterConfigs] = useState<Record<string, ScreenFilterConfig>>({});

  const setScreenFilterConfig = useCallback((screenId: string, config: ScreenFilterConfig | null) => {
    setScreenFilterConfigs(prev => {
      if (config === null) {
        const next = { ...prev };
        delete next[screenId];
        return next;
      }
      return { ...prev, [screenId]: config };
    });
  }, []);

  const getBackendFilters = useCallback((): Record<string, QueryFilterValue> => {
    const filters: Record<string, QueryFilterValue> = {};
    if (branch !== 'All') filters.branch = branch;
    if (region !== 'All') filters.region = region;
    if (cluster !== 'All') filters.cluster = cluster;
    if (searchQuery.trim()) filters.search = searchQuery.trim();
    return filters;
  }, [branch, cluster, region, searchQuery]);
  
  // State for data
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [metas, setMetas] = useState<Meta[]>([]);
  const [users, setUsers] = useState<User[]>([]);
  const [syncLogs, setSyncLogs] = useState<SyncLog[]>([]);
  const [isSyncing, setIsSyncing] = useState<boolean>(false);
  const [lastUpdated, setLastUpdated] = useState<string>('--:--:--');

  // Calculoteca Dinâmica
  const [calculatedFields, setCalculatedFields] = useState<CalculatedField[]>([
    {
      id: 'calc-previsao-vendas',
      workspaceId: 'ws-1',
      label: 'Previsão de Faturamento Geral (+15%)',
      formulaType: 'growth_multiplier',
      sourceField: 'valor_liquido',
      expression: '* 1.15'
    },
    {
      id: 'calc-ticket-medio',
      workspaceId: 'ws-1',
      label: 'Ticket Médio Estimado',
      formulaType: 'expression',
      sourceField: 'valor_liquido',
      expression: '* 0.90'
    },
    {
      id: 'calc-shopee-comissao',
      workspaceId: 'ws-2',
      label: 'Comissão Estimada Shopee (18% + R$3)',
      formulaType: 'expression',
      sourceField: 'valor_pago',
      expression: '* 0.18 + 3'
    },
    {
      id: 'calc-shopee-liquido',
      workspaceId: 'ws-2',
      label: 'Repasse Líquido Shopee (-18%)',
      formulaType: 'expression',
      sourceField: 'valor_pago',
      expression: '* 0.82'
    },
    {
      id: 'calc-crm-valor-medio',
      workspaceId: 'ws-3',
      label: 'Gasto Médio por Cliente CRM',
      formulaType: 'expression',
      sourceField: 'total_gasto',
      expression: '* 1.0'
    },
    {
      id: 'calc-dre-deducoes',
      workspaceId: 'ws-4',
      label: 'Deduções Tributárias Estimadas (15%)',
      formulaType: 'expression',
      sourceField: 'receita_bruta',
      expression: '* 0.15'
    },
    {
      id: 'calc-dre-margem-ebitda',
      workspaceId: 'ws-4',
      label: 'Margem EBITDA Estimada (18%)',
      formulaType: 'expression',
      sourceField: 'receita_bruta',
      expression: '* 0.18'
    }
  ]);

  const addCalculatedField = (field: CalculatedField) => {
    setCalculatedFields(prev => {
      if (prev.some(f => f.id === field.id)) return prev;
      return [...prev, field];
    });
  };

  const removeCalculatedField = (id: string) => {
    setCalculatedFields(prev => prev.filter(f => f.id !== id));
  };

  useEffect(() => {
    let active = true;

    const load = async () => {
      setDataStatus('loading');
      setDataStatusMessage(dataMode === 'mock' ? 'Carregando massa mockada...' : 'Carregando dados da API...');

      const result = await loadDashboardData(dataMode);
      if (!active) return;

      setCustomers(result.snapshot.customers);
      setMetas(result.snapshot.metas);
      setUsers(result.snapshot.users);
      setSyncLogs(result.snapshot.syncLogs);
      setLastUpdated(result.snapshot.lastUpdated);
      setDataStatus(result.status);
      setDataStatusMessage(result.message);
    };

    void load();

    return () => {
      active = false;
    };
  }, [dataMode]);

  useEffect(() => {
    if (!isConfigApiEnabled()) return;

    let active = true;

    const loadConfiguration = async () => {
      try {
        const user = await configApi.me();
        if (active) {
          setCurrentUser(user);
          if (user.is_staff) {
            persistDataMode('mock');
            setDataModeState('mock');
          }
        }

        // A equipe usa a biblioteca mockada local; somente tenants carregam
        // manifestos publicados pela API.
        const modules = user.is_staff ? [] : await configApi.modules();
        let menuOrder: string[] = [];
        try {
          menuOrder = (await configApi.userMenuOrder()).itemIds;
        } catch (error) {
          console.warn('Preferência pessoal do menu indisponível; usando a ordem local.', error);
        }
        if (active) {
          setPublishedModules(modules);
          if (menuOrder.length > 0) {
            setUserMenuOrder(menuOrder);
          } else {
            // Fallback: restaurar ordem salva localmente
            try {
              const lsKey = `bhs_menu_order_${user.client_slug ?? user.id}`;
              const saved = localStorage.getItem(lsKey);
              if (saved) {
                const parsed: string[] = JSON.parse(saved);
                if (Array.isArray(parsed) && parsed.length > 0) setUserMenuOrder(parsed);
              }
            } catch {}
          }
          setCurrentTab(prev => prev || pickInitialTab(user, modules));
        }
      } catch (error) {
        console.error('Erro ao carregar configuracao do backend:', error);
        if (active) {
          setPublishedModules([]);
          setCurrentTab('');
          showToast('Backend de configuracao indisponivel. Nenhuma tela local foi carregada no runtime real.');
        }
      }
    };

    void loadConfiguration();

    return () => {
      active = false;
    };
  }, [pickInitialTab]);

  const setDataMode = (mode: DataMode) => {
    if (isConfigApiEnabled() && currentUser && !currentUser.is_staff) {
      persistDataMode('api');
      setDataModeState('api');
      return;
    }
    persistDataMode(mode);
    setDataModeState(mode);
  };

  // Reset all filters
  const clearFilters = () => {
    setBranch('All');
    setRegion('All');
    setCluster('All');
    setSearchQuery('');
  };

  // Mutators
  const addMeta = (newMeta: Omit<Meta, 'id'>) => {
    const metaWithId: Meta = {
      ...newMeta,
      id: `MET-${100 + metas.length + 1}`
    };
    setMetas(prev => [metaWithId, ...prev]);
  };

  const updateMeta = (updatedMeta: Meta) => {
    setMetas(prev => prev.map(m => m.id === updatedMeta.id ? updatedMeta : m));
  };

  const deleteMeta = (id: string) => {
    setMetas(prev => prev.filter(m => m.id !== id));
  };

  const updateUserPermission = (userId: string, screen: string, access: 'None' | 'Read' | 'Write') => {
    setUsers(prev => prev.map(user => {
      if (user.id !== userId) return user;
      
      const permissions = user.permissions.map(p => 
        p.screen === screen ? { ...p, access } : p
      );
      
      return { ...user, permissions };
    }));
  };

  // Sync simulator
  const syncNow = async () => {
    if (isSyncing) return;
    setIsSyncing(true);

    if (isConfigApiEnabled() && currentUser && currentTab) {
      invalidateTenantScreen(tenantSessionKey(currentUser.client_slug, currentUser.id), currentTab);
      setScreenRefreshVersion(version => version + 1);
      setLastUpdated(new Date().toLocaleTimeString('pt-BR'));
      setIsSyncing(false);
      return;
    }

    const result = await syncDashboardData(dataMode, {
      customers,
      metas,
      users,
      syncLogs,
      lastUpdated
    });

    setCustomers(result.snapshot.customers);
    setMetas(result.snapshot.metas);
    setUsers(result.snapshot.users);
    setSyncLogs(result.snapshot.syncLogs);
    setLastUpdated(result.snapshot.lastUpdated);
    setDataStatus(result.status);
    setDataStatusMessage(result.message);
    setIsSyncing(false);
  };

  // Memoized filtered customers
  const filteredCustomers = useMemo(() => {
    return customers.filter(c => {
      // Filter by Region
      if (region !== 'All' && c.region !== region) return false;
      
      // Filter by RFV Cluster
      if (cluster !== 'All' && c.cluster !== cluster) return false;
      
      // Filter by search query (name or id)
      if (searchQuery) {
        const query = searchQuery.toLowerCase();
        const matchesName = c.name.toLowerCase().includes(query);
        const matchesId = c.id.toLowerCase().includes(query);
        const matchesRegion = c.region.toLowerCase().includes(query);
        if (!matchesName && !matchesId && !matchesRegion) return false;
      }
      
      return true;
    });
  }, [customers, region, cluster, searchQuery]);

  // Memoized filtered metas
  const filteredMetas = useMemo(() => {
    return metas.filter(m => {
      // Filter by Period
      if (m.period !== period) return false;
      
      // Filter by Branch
      if (branch !== 'All' && m.branch !== branch) return false;
      
      return true;
    });
  }, [metas, period, branch]);

  return (
    <DashboardContext.Provider value={{
      dataMode,
      setDataMode,
      dataStatus,
      dataStatusMessage,
      
      currentTab,
      setCurrentTab,
      screenRefreshVersion,

      period,
      branch,
      region,
      cluster,
      searchQuery,
      screenFilterConfigs,
      setPeriod,
      setBranch,
      setRegion,
      setCluster,
      setSearchQuery,
      setScreenFilterConfig,
      clearFilters,
      
      customers,
      metas,
      users,
      syncLogs,
      isSyncing,
      lastUpdated,
      
      workspaces,
      toggleWorkspaceActive,
      updateWorkspaceField,
      addWorkspace,
      updateWorkspaceConnectionParams,
      queryWorkspaceData,
      getWorkspaceRawData,
      getBackendFilters,

      // Calculoteca Dinâmica
      calculatedFields,
      addCalculatedField,
      removeCalculatedField,
      
      userModules,
      addUserModule,
      removeUserModule,
      updateUserModules,
      userMenuOrder,
      setUserMenuOrder,
      
      currentUser,
      setCurrentUser,
      previewMode,
      setPreviewMode,
      previewConfig,
      setPreviewConfig,
      
      isAskDrawerOpen,
      setIsAskDrawerOpen,
      
      activeToast,
      showToast,
      clearToast,
      
      addMeta,
      updateMeta,
      deleteMeta,
      updateUserPermission,
      syncNow,
      
      filteredCustomers,
      filteredMetas
    }}>
      {children}
    </DashboardContext.Provider>

  );
};

export const useDashboard = () => {
  const context = useContext(DashboardContext);
  if (!context) {
    throw new Error('useDashboard must be used within a DashboardProvider');
  }
  return context;
};
