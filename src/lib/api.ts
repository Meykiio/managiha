import { supabase } from "./supabaseClient";
import type {
  CarnetCustomer,
  Category,
  Product,
  Supplier,
  TransactionType,
  MovementType,
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
}

export async function fetchActiveProductsLite(storeId: string): Promise<ProductLite[]> {
  const { data, error } = await supabase
    .from("products_overview")
    .select("id, name, unit, current_stock, stock_status")
    .eq("store_id", storeId)
    .eq("active", true)
    .is("archived_at", null)
    .order("name")
    .limit(1000);
  if (error) throw new Error(error.message);
  return (data ?? []) as ProductLite[];
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

export async function callAdjustStock(input: {
  productId: string;
  movementType: MovementType;
  quantity: number;
  unitCost?: number | null;
  reason?: string | null;
  note?: string | null;
}): Promise<string> {
  const { data, error } = await supabase.rpc("adjust_stock", {
    p_product_id: input.productId,
    p_movement_type: input.movementType,
    p_quantity: input.quantity,
    p_unit_cost: input.unitCost ?? null,
    p_reason: input.reason ?? null,
    p_note: input.note ?? null,
  });
  if (error) throw new Error(error.message);
  return data as string;
}

export async function callRecordCarnetTransaction(input: {
  customerId: string;
  type: TransactionType;
  amount: number;
  note?: string | null;
}): Promise<string> {
  const { data, error } = await supabase.rpc("record_carnet_transaction", {
    p_customer_id: input.customerId,
    p_type: input.type,
    p_amount: input.amount,
    p_note: input.note ?? null,
  });
  if (error) throw new Error(error.message);
  return data as string;
}

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
    .limit(20);
  if (search.trim()) {
    const q = search.trim().replace(/[%,()]/g, "");
    query = query.or(`full_name.ilike.%${q}%,phone.ilike.%${q}%`);
  }
  const { data, error } = await query;
  if (error) throw new Error(error.message);
  return data ?? [];
}

const BUCKET = "product-images";

export async function uploadProductImage(
  storeId: string,
  productId: string,
  file: File
): Promise<string> {
  const path = `${storeId}/${productId}/${file.name}`;
  const { error } = await supabase.storage
    .from(BUCKET)
    .upload(path, file, { upsert: true, contentType: file.type });
  if (error) throw new Error(error.message);
  // Invalidate cache for this product
  productImageCache.delete(`${storeId}/${productId}`);
  return path;
}

export async function deleteProductImage(storeId: string, productId: string): Promise<void> {
  const { data: files } = await supabase.storage
    .from(BUCKET)
    .list(`${storeId}/${productId}`);
  if (!files || files.length === 0) return;
  const paths = files.map((f) => `${storeId}/${productId}/${f.name}`);
  const { error } = await supabase.storage.from(BUCKET).remove(paths);
  if (error) throw new Error(error.message);
  // Invalidate cache for this product
  productImageCache.delete(`${storeId}/${productId}`);
}

export async function getProductImageUrl(storeId: string, productId: string): Promise<string | null> {
  const cacheKey = `${storeId}/${productId}`;
  const cached = productImageCache.get(cacheKey);
  if (cached !== undefined) return cached;

  const { data: files } = await supabase.storage
    .from(BUCKET)
    .list(`${storeId}/${productId}`);
  if (!files || files.length === 0) {
    productImageCache.set(cacheKey, null);
    return null;
  }
  const { data } = await supabase.storage
    .from(BUCKET)
    .createSignedUrl(`${storeId}/${productId}/${files[0].name}`, 3600);
  const url = data?.signedUrl ?? null;
  productImageCache.set(cacheKey, url);
  return url;
}

const productImageCache = new Map<string, string | null | undefined>();

export interface CheckoutItem {
  product_id: string;
  quantity: number;
  unit_price: number;
}

export interface CheckoutResult {
  total: number;
  change: number;
  movement_ids: string[];
  items_count: number;
}

export async function callCheckoutSale(
  items: CheckoutItem[],
  paymentMode: "cash" | "credit",
  customerId?: string,
  amountReceived?: number,
  note?: string
): Promise<CheckoutResult> {
  const { data, error } = await supabase.rpc("checkout_sale", {
    p_items: items,
    p_payment_mode: paymentMode,
    p_customer_id: customerId ?? null,
    p_amount_received: amountReceived ?? null,
    p_note: note ?? null,
  });
  if (error) throw new Error(error.message);
  return data as CheckoutResult;
}
