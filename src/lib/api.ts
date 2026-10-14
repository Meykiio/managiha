import { supabase } from "./supabaseClient";
import type {
  CarnetCustomer,
  Category,
  DashboardTrendPoint,
  Product,
  Supplier,
  ProductOverview,
} from "./types";

export async function fetchCategories(storeId: string): Promise<Category[]> {
  const { data, error } = await supabase
    .from("categories")
    .select("*")
    .eq("store_id", storeId)
    .is("archived_at", null)
    .order("name")
    .limit(500);
  if (error) throw new Error(error.message);
  return data ?? [];
}

export async function ensureCategory(storeId: string, name: string): Promise<Category> {
  const existing = await supabase
    .from("categories")
    .select("*")
    .eq("store_id", storeId)
    .eq("name", name)
    .maybeSingle();
  if (existing.data) return existing.data as Category;
  const inserted = await supabase
    .from("categories")
    .insert({ store_id: storeId, name })
    .select("*")
    .single();
  if (inserted.error) throw new Error(inserted.error.message);
  return inserted.data as Category;
}

export async function fetchSuppliers(
  storeId: string,
  includeArchived = false
): Promise<Supplier[]> {
  let query = supabase.from("suppliers").select("*").eq("store_id", storeId);
  if (!includeArchived) query = query.is("archived_at", null);
  const { data, error } = await query.order("name").limit(500);
  if (error) throw new Error(error.message);
  return data ?? [];
}

export interface ProductLite {
  id: string;
  name: string;
  unit: Product["unit"];
  current_stock: number;
  stock_status: ProductOverview["stock_status"];
  /** Needed to price a sale recorded from the inventory tab, not just at the till. */
  sell_price: number;
}

const LITE_COLUMNS = "id, name, unit, current_stock, stock_status, sell_price";

/**
 * Server-side product search for the pickers.
 *
 * The pickers used to download a thousand rows and filter the first hundred of
 * them in the browser, so a shop with more references than that could type an
 * exact product name and be told there was no match. The cut-off was silent,
 * which made it a data-loss bug rather than a performance one.
 *
 * Matches names, barcodes and SKUs so the same field works for a typed name and
 * for a scanner aimed at the keyboard.
 */
export async function searchProductsLite(
  storeId: string,
  query: string,
  limit = 30
): Promise<ProductLite[]> {
  const term = query.trim();
  if (!term) return [];
  const safe = term.replace(/[%,()*\\]/g, "").replace(/"/g, "");
  if (!safe) return [];

  const { data, error } = await supabase
    .from("products_overview")
    .select(LITE_COLUMNS)
    .eq("store_id", storeId)
    .eq("active", true)
    .is("archived_at", null)
    .or(`name.ilike.%${safe}%,barcode.eq.${safe},sku.eq.${safe}`)
    .order("name")
    .limit(limit);
  if (error) throw new Error(error.message);
  return (data ?? []) as ProductLite[];
}

/** Resolve one product for the picker's collapsed label. */
export async function fetchProductLite(
  storeId: string,
  productId: string
): Promise<ProductLite | null> {
  const { data, error } = await supabase
    .from("products_overview")
    .select(LITE_COLUMNS)
    .eq("store_id", storeId)
    .eq("id", productId)
    .maybeSingle();
  if (error) throw new Error(error.message);
  return (data as ProductLite) ?? null;
}

/**
 * Daily series for the dashboard metric cards.
 *
 * The design system requires every metric card to carry a delta and a sparkline,
 * and a delta needs history. This reconstructs it from the immutable movement and
 * transaction ledgers rather than reading a snapshot table, so there is no second
 * source of truth to drift.
 */
export async function fetchDashboardTrends(days = 14): Promise<DashboardTrendPoint[]> {
  const { data, error } = await supabase.rpc("get_dashboard_trends", { p_days: days });
  if (error) throw new Error(error.message);
  return (data ?? []) as DashboardTrendPoint[];
}

export async function fetchLowStockProducts(
  storeId: string,
  limit = 50
): Promise<ProductOverview[]> {
  const { data, error } = await supabase
    .from("products_overview")
    .select("*")
    .eq("store_id", storeId)
    .eq("active", true)
    .is("archived_at", null)
    .in("stock_status", ["low", "out"])
    .order("current_stock")
    .limit(limit);
  if (error) throw new Error(error.message);
  return (data ?? []) as ProductOverview[];
}

/**
 * Find products by whatever the user has to hand — a barcode off a packet, or a
 * name they typed.
 *
 * Both are needed. A quartier grocery sells a lot of things that carry no usable
 * barcode: bulk goods, repackaged rice and spices, anything bought by the sack.
 * Requiring a barcode to sell something excludes a large part of the shelf.
 *
 * Barcode and SKU are matched exactly (a partial barcode is not a hit), the name
 * loosely. Results are ordered so an exact code beats an exact name beats a
 * partial name, which is the order a cashier expects when they scan and the item
 * is also called something else.
 */
export async function searchProducts(
  storeId: string,
  query: string,
  limit = 20
): Promise<Product[]> {
  const term = query.trim();
  if (!term) return [];
  // PostgREST `or()` is parsed as a filter expression, so the characters that
  // mean something to it cannot appear in the value.
  const safe = term.replace(/[%,()*\\]/g, "").replace(/"/g, "");
  if (!safe) return [];

  const { data, error } = await supabase
    .from("products")
    .select("*")
    .eq("store_id", storeId)
    .eq("active", true)
    .is("archived_at", null)
    .or(`barcode.eq.${safe},sku.eq.${safe},name.ilike.%${safe}%`)
    .order("name")
    .limit(limit);
  if (error) throw new Error(error.message);

  const exact = (p: Product) =>
    (p.barcode ?? "").toLowerCase() === term.toLowerCase() ||
    (p.sku ?? "").toLowerCase() === term.toLowerCase();
  return ((data ?? []) as Product[]).sort((a, b) => Number(exact(b)) - Number(exact(a)));
}

/**
 * Writes live in src/lib/rpc.ts and lot reads in src/lib/lots.ts. This module is
 * reads only, which is what lets it stay comfortably under the 250-line limit.
 * The re-exports below keep every existing import path working.
 */
export {
  callAdjustStock,
  callRecordCarnetTransaction,
  callCheckoutSale,
  type CheckoutItem,
  type CheckoutResult,
} from "./rpc";

export async function searchCarnetCustomers(
  storeId: string,
  search: string
): Promise<CarnetCustomer[]> {
  let query = supabase
    .from("carnet_customers")
    .select("*")
    .eq("store_id", storeId)
    .is("archived_at", null)
    .order("full_name")
    .limit(30);
  if (search.trim()) {
    const q = search.trim().replace(/[%,()]/g, "");
    query = query.or(`full_name.ilike.%${q}%,phone.ilike.%${q}%`);
  }
  const { data, error } = await query;
  if (error) throw new Error(error.message);
  return data ?? [];
}

/** Resolve one customer, for a picker that was handed an id from another screen. */
export async function fetchCarnetCustomer(
  storeId: string,
  customerId: string
): Promise<CarnetCustomer | null> {
  const { data, error } = await supabase
    .from("carnet_customers")
    .select("*")
    .eq("store_id", storeId)
    .eq("id", customerId)
    .maybeSingle();
  if (error) throw new Error(error.message);
  return (data as CarnetCustomer) ?? null;
}
