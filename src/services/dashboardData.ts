import type { Customer, DashboardDataSnapshot, DataMode, DataStatus, Meta, SyncLog, User } from '../types';
import { generateCustomers, initialMetas, initialSyncLogs, initialUsers } from './mockData';

const DATA_MODE_STORAGE_KEY = 'bhs:data-mode';

interface DashboardDataResult {
  snapshot: DashboardDataSnapshot;
  status: DataStatus;
  message: string;
}

const getNowParts = () => {
  const now = new Date();
  return {
    timeString: now.toTimeString().split(' ')[0],
    dateString: now.toISOString().slice(0, 10),
  };
};

const createMockSnapshot = (): DashboardDataSnapshot => ({
  customers: generateCustomers(),
  metas: initialMetas,
  users: initialUsers,
  syncLogs: initialSyncLogs,
  lastUpdated: '15:10:00',
});

const getApiUrl = () => import.meta.env.VITE_DASHBOARD_API_URL || '/api/dashboard';

const normalizeSnapshot = (payload: Partial<DashboardDataSnapshot>): DashboardDataSnapshot => {
  const fallback = createMockSnapshot();

  return {
    customers: Array.isArray(payload.customers) ? payload.customers as Customer[] : fallback.customers,
    metas: Array.isArray(payload.metas) ? payload.metas as Meta[] : fallback.metas,
    users: Array.isArray(payload.users) ? payload.users as User[] : fallback.users,
    syncLogs: Array.isArray(payload.syncLogs) ? payload.syncLogs as SyncLog[] : fallback.syncLogs,
    lastUpdated: typeof payload.lastUpdated === 'string' ? payload.lastUpdated : fallback.lastUpdated,
  };
};

export const getInitialDataMode = (): DataMode => {
  const persisted = localStorage.getItem(DATA_MODE_STORAGE_KEY);
  if (persisted === 'mock' || persisted === 'api') return persisted;

  const envMode = import.meta.env.VITE_DATA_MODE;
  return envMode === 'api' ? 'api' : 'mock';
};

export const persistDataMode = (mode: DataMode) => {
  localStorage.setItem(DATA_MODE_STORAGE_KEY, mode);
};

export const loadDashboardData = async (mode: DataMode): Promise<DashboardDataResult> => {
  if (mode === 'mock') {
    return {
      snapshot: createMockSnapshot(),
      status: 'ready',
      message: 'Modo mock ativo.',
    };
  }

  try {
    const response = await fetch(getApiUrl(), {
      headers: {
        Accept: 'application/json',
      },
    });

    if (!response.ok) {
      throw new Error(`HTTP ${response.status}`);
    }

    const payload = await response.json() as Partial<DashboardDataSnapshot>;
    return {
      snapshot: normalizeSnapshot(payload),
      status: 'ready',
      message: 'Modo API ativo.',
    };
  } catch {
    return {
      snapshot: createMockSnapshot(),
      status: 'fallback',
      message: 'API indisponível. Fallback para mock aplicado.',
    };
  }
};

const buildMockSyncSnapshot = (snapshot: DashboardDataSnapshot): DashboardDataSnapshot => {
  const { timeString, dateString } = getNowParts();
  const newLog: SyncLog = {
    id: `LOG-00${snapshot.syncLogs.length + 1}`,
    timestamp: `${dateString} ${timeString}`,
    status: 'Success',
    rowsProcessed: Math.floor(Math.random() * 500) + 12500,
    durationSeconds: parseFloat((Math.random() * 2 + 2).toFixed(1)),
    initiatedBy: 'Bruno Henrique (Manual)',
  };

  return {
    ...snapshot,
    customers: snapshot.customers.map(customer => {
      if (Math.random() > 0.8) {
        return {
          ...customer,
          recency: Math.max(1, customer.recency - Math.floor(Math.random() * 3)),
          frequency: customer.frequency + 1,
          value: customer.value + Math.floor(Math.random() * 5000),
        };
      }

      return customer;
    }),
    syncLogs: [newLog, ...snapshot.syncLogs],
    lastUpdated: timeString,
  };
};

export const syncDashboardData = async (
  mode: DataMode,
  snapshot: DashboardDataSnapshot,
): Promise<DashboardDataResult> => {
  if (mode === 'mock') {
    await new Promise(resolve => setTimeout(resolve, 900));

    return {
      snapshot: buildMockSyncSnapshot(snapshot),
      status: 'ready',
      message: 'Mock sincronizado.',
    };
  }

  try {
    const response = await fetch(`${getApiUrl()}/sync`, {
      method: 'POST',
      headers: {
        Accept: 'application/json',
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ trigger: 'manual' }),
    });

    if (!response.ok) {
      throw new Error(`HTTP ${response.status}`);
    }

    const payload = await response.json() as Partial<DashboardDataSnapshot>;
    return {
      snapshot: normalizeSnapshot(payload),
      status: 'ready',
      message: 'API sincronizada.',
    };
  } catch {
    const { timeString, dateString } = getNowParts();
    const failedLog: SyncLog = {
      id: `LOG-00${snapshot.syncLogs.length + 1}`,
      timestamp: `${dateString} ${timeString}`,
      status: 'Failed',
      rowsProcessed: 0,
      durationSeconds: 0,
      initiatedBy: 'API indisponível',
    };

    return {
      snapshot: {
        ...snapshot,
        syncLogs: [failedLog, ...snapshot.syncLogs],
      },
      status: 'error',
      message: 'Falha ao sincronizar API.',
    };
  }
};
