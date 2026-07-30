import type { ComboProductOption, ComboSimulationData } from '../types';

const PRODUCT_CATALOG: ComboProductOption[] = [
  { id: '1', name: 'Licenciamento Power BI Pro (BHS Premium)', defaultQty: 15, cost: 32.5, price: 49.9, markup: 53.54 },
  { id: '2', name: 'Consultoria BI & Analytics (Horas de Suporte)', defaultQty: 40, cost: 110, price: 185, markup: 68.18 },
  { id: '4', name: 'Setup de Data Warehouse Gerencial', defaultQty: 1, cost: 2800, price: 4200, markup: 50 },
  { id: '5', name: 'Pacote de Treinamento Executivo BI', defaultQty: 8, cost: 180, price: 320, markup: 77.78 },
  { id: '6', name: 'Integracao API ERP + Dashboard', defaultQty: 1, cost: 1650, price: 2900, markup: 75.76 },
  { id: '7', name: 'Monitoramento Mensal de Indicadores', defaultQty: 1, cost: 820, price: 1450, markup: 76.83 },
  { id: '8', name: 'Pacote de Licencas Microsoft Fabric', defaultQty: 12, cost: 58, price: 92, markup: 58.62 },
  { id: '3', name: 'Servico Mensal de Sustentacao de Dashboards', defaultQty: 1, cost: 1200, price: 1950, markup: 62.5 },
];

export const buildMockComboSimulationData = (): ComboSimulationData => ({
  productCatalog: PRODUCT_CATALOG,
  initialProducts: PRODUCT_CATALOG.filter((product) => ['1', '2', '3'].includes(product.id)),
  storageKey: 'bhs_saved_simulations',
});
