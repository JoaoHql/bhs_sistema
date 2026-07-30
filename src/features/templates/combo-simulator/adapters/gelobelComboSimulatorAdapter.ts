import type { ComboProductOption, ComboSimulationData } from '../types';

export interface GelobelComboProductRow {
  product_id: number;
  company: string;
  code: string;
  description: string;
  unit: string | null;
  unit_cost: number | null;
  unit_price: number | null;
}

const normalizeProduct = (row: GelobelComboProductRow): ComboProductOption => {
  const cost = Math.max(0, Number(row.unit_cost ?? 0));
  const price = Math.max(0, Number(row.unit_price ?? 0));

  return {
    id: `${row.company}:${row.product_id}`,
    name: row.description,
    defaultQty: 1,
    cost,
    price,
    markup: cost > 0 ? Math.round(((price - cost) / cost) * 10000) / 100 : 0,
    sku: row.code,
    company: row.company,
    unit: row.unit ?? undefined,
    hasCost: cost > 0,
  };
};

export const buildGelobelComboSimulationData = (
  rows: GelobelComboProductRow[],
  selectedCompany: string,
  searchCatalog: (search: string) => Promise<ComboProductOption[]>,
): ComboSimulationData => {
  const productCatalog = Array.from(
    new Map(
      rows
        .filter((row) => row.company === selectedCompany)
        .map(normalizeProduct)
        .map((product) => [product.id, product]),
    ).values(),
  );
  const initialProducts = productCatalog.filter((product) => product.cost > 0 && product.price > 0).slice(0, 3);

  return {
    productCatalog,
    initialProducts: initialProducts.length === 3 ? initialProducts : productCatalog.slice(0, 3),
    storageKey: `gelobel_saved_combo_simulations_${selectedCompany}`,
    searchCatalog,
  };
};

export const adaptGelobelComboProducts = (
  rows: GelobelComboProductRow[],
  selectedCompany: string,
): ComboProductOption[] => Array.from(
  new Map(
    rows
      .filter((row) => row.company === selectedCompany)
      .map(normalizeProduct)
      .map((product) => [product.id, product]),
  ).values(),
);
