export interface ComboProductOption {
  id: string;
  name: string;
  defaultQty: number;
  cost: number;
  price: number;
  markup?: number;
  sku?: string;
  company?: string;
  unit?: string;
  hasCost?: boolean;
}

export interface ComboSelectedProduct extends ComboProductOption {
  qty: number;
  simulatedCost?: number | null;
  simulatedPrice?: number | null;
}

export interface SavedComboSimulationProduct {
  id: string;
  name: string;
  qty: number;
  cost: number;
  price: number;
  markup: number;
  simulatedCost?: number | null;
  simulatedPrice?: number | null;
}

export interface SavedComboSimulation {
  id: string;
  name: string;
  createdAt: string;
  products: SavedComboSimulationProduct[];
}

export interface ComboSimulationPersistence {
  savedSimulations: SavedComboSimulation[];
  createSavedSimulation: (input: {
    name: string;
    products: SavedComboSimulationProduct[];
  }) => Promise<SavedComboSimulation>;
  deleteSavedSimulation: (id: string) => Promise<void>;
}

export interface ComboSimulationData {
  productCatalog: ComboProductOption[];
  initialProducts: ComboProductOption[];
  storageKey: string;
  searchCatalog?: (search: string) => Promise<ComboProductOption[]>;
  persistence?: ComboSimulationPersistence;
}
