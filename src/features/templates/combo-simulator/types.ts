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

export interface ComboSimulationData {
  productCatalog: ComboProductOption[];
  initialProducts: ComboProductOption[];
  storageKey: string;
  searchCatalog?: (search: string) => Promise<ComboProductOption[]>;
}
