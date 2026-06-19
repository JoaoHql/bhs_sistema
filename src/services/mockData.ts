import type { Customer, Meta, User, SyncLog } from '../types';


// Pre-defined list of customer names for realistic data
const companyNames = [
  'Tech Solutions', 'Nova Indústria', 'Global Trade', 'Alpha Consultoria', 'Beta Sistemas',
  'Omega Varejo', 'Delta Logística', 'Prime Distribuidora', 'Zeta Serviços', 'Infinity Tech',
  'Nexus Corp', 'Apex Empreendimentos', 'Horizonte Agronegócios', 'Vanguard Seguros', 'Solar Energia',
  'Pinnacle Engenharia', 'Genesis Alimentos', 'Summit Financeira', 'Quantum Telecom', 'Matrix Educacional',
  'Polaris Química', 'Aurora Alimentos', 'Krypton Segurança', 'Titan Construtora', 'Aero Transportes',
  'Atlas Logística', 'Zephyr Moda', 'Orion Cosméticos', 'Helios Farmacêutica', 'Giga Hardware',
  'Tera Softwares', 'Byte Soluções', 'Net Link', 'Web Host', 'Digital Hub',
  'Eco Clean', 'Bio Lab', 'Green Energy', 'Max Atacado', 'Minas Metais',
  'Rio Tech', 'Paulista Distribuição', 'Sinos Couros', 'Catarina Têxtil', 'Gaúcha Transportes',
  'Carioca Alimentos', 'Nordeste Alimentos', 'Bahia Serviços', 'Ceará Tec', 'Pernambuco Têxtil'
];

const regions = ['SP', 'RJ', 'MG', 'PR', 'SC', 'RS', 'BA', 'DF', 'PE', 'CE'];

// Function to generate rich customer mock data
export const generateCustomers = (): Customer[] => {
  const list: Customer[] = [];
  
  companyNames.forEach((name, index) => {
    // Determine cluster based on index to distribute them realistically
    let recency = 0;
    let frequency = 0;
    let value = 0;
    let cluster: Customer['cluster'];
    
    const r = index % 5;
    
    if (r === 0) {
      // Champions: Active, buying often, high value
      recency = Math.floor(Math.random() * 15) + 1; // 1 to 15 days
      frequency = Math.floor(Math.random() * 15) + 10; // 10 to 25 orders
      value = Math.floor(Math.random() * 150000) + 80000; // 80k to 230k
      cluster = 'Champions';
    } else if (r === 1) {
      // Loyal: Active, buy regularly, medium value
      recency = Math.floor(Math.random() * 30) + 10; // 10 to 40 days
      frequency = Math.floor(Math.random() * 8) + 6; // 6 to 14 orders
      value = Math.floor(Math.random() * 70000) + 30000; // 30k to 100k
      cluster = 'Loyal';
    } else if (r === 2) {
      // At Risk: Haven't bought in a while, but used to buy a lot
      recency = Math.floor(Math.random() * 90) + 60; // 60 to 150 days
      frequency = Math.floor(Math.random() * 12) + 5; // 5 to 17 orders
      value = Math.floor(Math.random() * 120000) + 50000; // 50k to 170k
      cluster = 'At Risk';
    } else if (r === 3) {
      // About to Sleep: Haven't bought in a long time, low frequency and value
      recency = Math.floor(Math.random() * 180) + 120; // 120 to 300 days
      frequency = Math.floor(Math.random() * 3) + 1; // 1 to 4 orders
      value = Math.floor(Math.random() * 20000) + 5000; // 5k to 25k
      cluster = 'About to Sleep';
    } else {
      // New: Just bought, low frequency, low/medium value
      recency = Math.floor(Math.random() * 10) + 1; // 1 to 10 days
      frequency = Math.floor(Math.random() * 2) + 1; // 1 to 3 orders
      value = Math.floor(Math.random() * 35000) + 2000; // 2k to 37k
      cluster = 'New';
    }

    // Assign region based on index
    const region = regions[index % regions.length];

    list.push({
      id: `CLI-${1000 + index}`,
      name: `${name} ${index % 2 === 0 ? 'Ltda' : 'S/A'}`,
      recency,
      frequency,
      value,
      region,
      cluster
    });
  });

  // Add a second batch of 50 more customers for dense data table
  for (let i = 0; i < 50; i++) {
    const baseIndex = i + companyNames.length;
    const name = `Cliente Especial ${baseIndex}`;
    const region = regions[Math.floor(Math.random() * regions.length)];
    const clusters: Customer['cluster'][] = ['Champions', 'Loyal', 'At Risk', 'About to Sleep', 'New'];
    const cluster = clusters[Math.floor(Math.random() * clusters.length)];
    
    let recency = 30;
    let frequency = 5;
    let value = 15000;

    switch (cluster) {
      case 'Champions':
        recency = Math.floor(Math.random() * 12) + 1;
        frequency = Math.floor(Math.random() * 10) + 12;
        value = Math.floor(Math.random() * 100000) + 100000;
        break;
      case 'Loyal':
        recency = Math.floor(Math.random() * 30) + 5;
        frequency = Math.floor(Math.random() * 6) + 6;
        value = Math.floor(Math.random() * 40000) + 40000;
        break;
      case 'At Risk':
        recency = Math.floor(Math.random() * 80) + 70;
        frequency = Math.floor(Math.random() * 8) + 4;
        value = Math.floor(Math.random() * 60000) + 50000;
        break;
      case 'About to Sleep':
        recency = Math.floor(Math.random() * 200) + 100;
        frequency = Math.floor(Math.random() * 3) + 1;
        value = Math.floor(Math.random() * 15000) + 1000;
        break;
      case 'New':
        recency = Math.floor(Math.random() * 8) + 1;
        frequency = Math.floor(Math.random() * 2) + 1;
        value = Math.floor(Math.random() * 20000) + 2000;
        break;
    }

    list.push({
      id: `CLI-${1000 + baseIndex}`,
      name,
      recency,
      frequency,
      value,
      region,
      cluster
    });
  }

  return list;
};

// Initial Metas (Targets)
export const initialMetas: Meta[] = [
  { id: 'MET-001', category: 'Software Licenças', branch: 'Filial Sul', vendedor: 'Amanda Souza', empresa: 'Tech Solutions', target: 500000, actual: 480000, period: 'Jun/2026' },
  { id: 'MET-002', category: 'Consultoria Integrada', branch: 'Filial Sul', vendedor: 'Carlos Oliveira', empresa: 'Beta Sistemas', target: 200000, actual: 215000, period: 'Jun/2026' },
  { id: 'MET-003', category: 'Suporte & SLA', branch: 'Filial Sul', vendedor: 'Amanda Souza', empresa: 'Nova Indústria', target: 150000, actual: 120000, period: 'Jun/2026' },
  { id: 'MET-004', category: 'Software Licenças', branch: 'Filial Sudeste', vendedor: 'Roberto Alves', empresa: 'Alpha Consultoria', target: 1200000, actual: 1150000, period: 'Jun/2026' },
  { id: 'MET-005', category: 'Consultoria Integrada', branch: 'Filial Sudeste', vendedor: 'Roberto Alves', empresa: 'Omega Varejo', target: 450000, actual: 390000, period: 'Jun/2026' },
  { id: 'MET-006', category: 'Suporte & SLA', branch: 'Filial Sudeste', vendedor: 'Mariana Costa', empresa: 'Delta Logística', target: 300000, actual: 310000, period: 'Jun/2026' },
  { id: 'MET-007', category: 'Hardware Infrainstr.', branch: 'Filial Sudeste', vendedor: 'Mariana Costa', empresa: 'Prime Distribuidora', target: 600000, actual: 520000, period: 'Jun/2026' },
  { id: 'MET-008', category: 'Software Licenças', branch: 'Filial Nordeste', vendedor: 'Fernanda Lima', empresa: 'Zeta Serviços', target: 400000, actual: 410000, period: 'Jun/2026' },
  { id: 'MET-009', category: 'Consultoria Integrada', branch: 'Filial Nordeste', vendedor: 'João Pedro', empresa: 'Infinity Tech', target: 150000, actual: 110000, period: 'Jun/2026' },
  { id: 'MET-010', category: 'Suporte & SLA', branch: 'Filial Nordeste', vendedor: 'Fernanda Lima', empresa: 'Nexus Corp', target: 100000, actual: 95000, period: 'Jun/2026' },
];

// Initial Users configuration
export const initialUsers: User[] = [
  {
    id: 'USR-001',
    name: 'Bruno Henrique Silva',
    email: 'bruno@bhs.com.br',
    role: 'Admin',
    permissions: [
      { screen: 'Análises', access: 'Write' },
      { screen: 'Cadastros', access: 'Write' },
      { screen: 'Configurações', access: 'Write' }
    ]
  },
  {
    id: 'USR-002',
    name: 'Amanda Souza',
    email: 'amanda.souza@bhs.com.br',
    role: 'Analista',
    permissions: [
      { screen: 'Análises', access: 'Write' },
      { screen: 'Cadastros', access: 'Read' },
      { screen: 'Configurações', access: 'None' }
    ]
  },
  {
    id: 'USR-003',
    name: 'Carlos Oliveira',
    email: 'carlos.oliveira@bhs.com.br',
    role: 'Leitor',
    permissions: [
      { screen: 'Análises', access: 'Read' },
      { screen: 'Cadastros', access: 'None' },
      { screen: 'Configurações', access: 'None' }
    ]
  }
];

// Initial Sync Logs
export const initialSyncLogs: SyncLog[] = [
  { id: 'LOG-001', timestamp: '2026-06-18 10:00:15', status: 'Success', rowsProcessed: 12450, durationSeconds: 4.2, initiatedBy: 'System Scheduler' },
  { id: 'LOG-002', timestamp: '2026-06-18 12:00:10', status: 'Success', rowsProcessed: 12462, durationSeconds: 3.8, initiatedBy: 'System Scheduler' },
  { id: 'LOG-003', timestamp: '2026-06-18 14:00:22', status: 'Success', rowsProcessed: 12480, durationSeconds: 4.5, initiatedBy: 'System Scheduler' },
  { id: 'LOG-004', timestamp: '2026-06-18 15:10:00', status: 'Success', rowsProcessed: 12515, durationSeconds: 3.1, initiatedBy: 'Bruno Henrique (Manual)' }
];
