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

/**
 * One physical delivery of a product. Read-only from the client: product_lots has
 * no write policy, so quantities only ever change through adjust_stock() or
 * checkout_sale(). `expiry_date` is nullable for goods that do not expire.
 */
export interface ProductLot {
  id: string;
  product_id: string;
  expiry_date: string | null;
  lot_code: string | null;
  quantity: number;
  unit_cost: number | null;
  received_at: string;
  closed_at: string | null;
}

/**
 * One open dated lot, from the expiry_report view.
 *
 * `days_left` and the two value figures are computed by Postgres. The report used
 * to derive days-left in the browser from `products.expiry_date`, which is a
 * single date per product and cannot describe three deliveries arriving three
 * weeks apart — so the number it showed was of the right shape and the wrong
 * thing.
 */
export interface ExpiryRow {
  lot_id: string;
  store_id: string;
  product_id: string;
  product_name: string;
  unit: string;
  expiry_date: string;
  quantity: number;
  lot_code: string | null;
  sell_price: number | null;
  cost_price: number | null;
  /** Sell value of this lot if it expires unsold. */
  value_at_risk: number;
  /** Negative once the date has passed. */
  days_left: number;
}

/** Period totals from get_sales_summary(). Revenue is exact; margin is not. */
export interface SalesSummary {
  revenue: number;
  units: number;
  sale_count: number;
  /**
   * Cost of the goods sold, valued at the product's CURRENT cost price — the
   * ledger records the price charged, not the price paid. Labelled as an estimate
   * wherever it is shown.
   */
  cogs_estimated: number;
  margin_estimated: number;
}

export interface TopProduct {
  product_id: string;
  name: string;
  unit: string;
  units_sold: number;
  revenue: number;
  margin_est: number;
}

export interface DeadStockRow {
  product_id: string;
  name: string;
  unit: string;
  current_stock: number;
  unit_cost: number | null;
  value_tied_up: number;
  last_sold_at: string | null;
  days_idle: number;
}

export interface ReorderRow {
  product_id: string;
  product_name: string;
  unit: string;
  current_stock: number;
  threshold: number | null;
  units_sold: number;
  suggested_qty: number;
  supplier_id: string | null;
  supplier_name: string | null;
  supplier_phone: string | null;
  supplier_whatsapp: string | null;
}

/**
 * One day of the dashboard series, from get_dashboard_trends().
 *
 * Stock value is reconstructed from the append-only movement ledger rather than
 * snapshotted, so a past day is exact rather than approximate.
 */
export interface DashboardTrendPoint {
  day: string;
  stock_value: number;
  carnet_outstanding: number;
  sales_value: number;
  movement_count: number;
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
