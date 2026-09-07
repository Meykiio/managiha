export type Unit =
  | "piece"
  | "kg"
  | "g"
  | "liter"
  | "box"
  | "pack";

export type MovementType =
  | "receive"
  | "sale"
  | "return"
  | "damage"
  | "theft"
  | "count_adjustment"
  | "correction"
  | "opening_balance";

export type TransactionType = "credit" | "payment" | "adjustment";

export type StockStatus = "healthy" | "low" | "out";

export interface Profile {
  id: string;
  full_name: string | null;
  phone: string | null;
  created_at: string;
  updated_at: string;
}

export interface Store {
  id: string;
  owner_id: string;
  name: string;
  address: string | null;
  phone: string | null;
  currency: string;
  language: string;
  timezone: string;
  created_at: string;
  updated_at: string;
}

export interface Category {
  id: string;
  store_id: string;
  name: string;
  archived_at: string | null;
  created_at: string;
  updated_at: string;
}

export interface Supplier {
  id: string;
  store_id: string;
  name: string;
  phone: string | null;
  whatsapp: string | null;
  address: string | null;
  notes: string | null;
  archived_at: string | null;
  created_at: string;
  updated_at: string;
}

export interface Product {
  id: string;
  store_id: string;
  category_id: string | null;
  supplier_id: string | null;
  name: string;
  sku: string | null;
  barcode: string | null;
  unit: Unit;
  cost_price: number;
  sell_price: number;
  current_stock: number;
  low_stock_threshold: number | null;
  expiry_date: string | null;
  image_path: string | null;
  active: boolean;
  archived_at: string | null;
  created_at: string;
  updated_at: string;
}

export type ProductOverview = Product & { stock_status: StockStatus };

export interface StockMovement {
  id: string;
  store_id: string;
  product_id: string;
  movement_type: MovementType;
  quantity: number;
  unit_cost: number | null;
  reason: string | null;
  note: string | null;
  created_by: string | null;
  created_at: string;
}

export type StockMovementWithProduct = StockMovement & {
  product: Pick<Product, "id" | "name" | "unit"> | null;
};

export interface CarnetCustomer {
  id: string;
  store_id: string;
  full_name: string;
  phone: string | null;
  notes: string | null;
  balance: number;
  archived_at: string | null;
  created_at: string;
  updated_at: string;
}

export interface CarnetTransaction {
  id: string;
  store_id: string;
  customer_id: string;
  type: TransactionType;
  amount: number;
  note: string | null;
  created_by: string | null;
  created_at: string;
}

export type CarnetTransactionWithCustomer = CarnetTransaction & {
  customer: Pick<CarnetCustomer, "id" | "full_name"> | null;
};

export interface DashboardStats {
  stock_value: number;
  low_count: number;
  out_count: number;
  carnet_total: number;
  product_count: number;
}
