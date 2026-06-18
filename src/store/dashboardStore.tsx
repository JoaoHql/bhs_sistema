import React, { createContext, useContext, useState, useMemo } from 'react';
import type { Customer, Meta, User, SyncLog, RFVCluster } from '../types';

import { generateCustomers, initialMetas, initialUsers, initialSyncLogs } from '../services/mockData';

interface DashboardContextType {
  // Filter States
  period: string;
  branch: string;
  region: string;
  cluster: RFVCluster | 'All';
  searchQuery: string;
  
  // Setters
  setPeriod: (period: string) => void;
  setBranch: (branch: string) => void;
  setRegion: (region: string) => void;
  setCluster: (cluster: RFVCluster | 'All') => void;
  setSearchQuery: (query: string) => void;
  clearFilters: () => void;
  
  // Data States
  customers: Customer[];
  metas: Meta[];
  users: User[];
  syncLogs: SyncLog[];
  isSyncing: boolean;
  lastUpdated: string;
  
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

const DashboardContext = createContext<DashboardContextType | undefined>(undefined);

export const DashboardProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  // State for filters
  const [period, setPeriod] = useState<string>('Jun/2026');
  const [branch, setBranch] = useState<string>('All');
  const [region, setRegion] = useState<string>('All');
  const [cluster, setCluster] = useState<RFVCluster | 'All'>('All');
  const [searchQuery, setSearchQuery] = useState<string>('');
  
  // State for data
  const [customers, setCustomers] = useState<Customer[]>(() => generateCustomers());
  const [metas, setMetas] = useState<Meta[]>(initialMetas);
  const [users, setUsers] = useState<User[]>(initialUsers);
  const [syncLogs, setSyncLogs] = useState<SyncLog[]>(initialSyncLogs);
  const [isSyncing, setIsSyncing] = useState<boolean>(false);
  const [lastUpdated, setLastUpdated] = useState<string>('15:10:00');

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
    
    // Simulate API delay
    await new Promise(resolve => setTimeout(resolve, 2500));
    
    const now = new Date();
    const timeString = now.toTimeString().split(' ')[0];
    const dateString = now.toISOString().slice(0, 10);
    
    const newLog: SyncLog = {
      id: `LOG-00${syncLogs.length + 1}`,
      timestamp: `${dateString} ${timeString}`,
      status: 'Success',
      rowsProcessed: Math.floor(Math.random() * 500) + 12500,
      durationSeconds: parseFloat((Math.random() * 2 + 2).toFixed(1)),
      initiatedBy: 'Bruno Henrique (Manual)'
    };
    
    setSyncLogs(prev => [newLog, ...prev]);
    // Randomly update customer counts or values slightly to simulate "new data"
    setCustomers(prev => prev.map(c => {
      if (Math.random() > 0.8) {
        return {
          ...c,
          recency: Math.max(1, c.recency - Math.floor(Math.random() * 3)),
          frequency: c.frequency + 1,
          value: c.value + Math.floor(Math.random() * 5000)
        };
      }
      return c;
    }));

    setLastUpdated(timeString);
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
      period,
      branch,
      region,
      cluster,
      searchQuery,
      setPeriod,
      setBranch,
      setRegion,
      setCluster,
      setSearchQuery,
      clearFilters,
      
      customers,
      metas,
      users,
      syncLogs,
      isSyncing,
      lastUpdated,
      
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
