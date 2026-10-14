import { supabase } from "./supabaseClient";
import { callAdjustStock, callRecordCarnetTransaction, ensureCategory } from "./api";
import type { Store } from "./types";

async function insertProduct(
  storeId: string,
  name: string,
  categoryId: string | null,
  cost: number,
  sell: number,
  threshold: number,
  qty: number
): Promise<string> {
  const res = await supabase
    .from("products")
    .insert({
      store_id: storeId,
      category_id: categoryId,
      name,
      unit: "piece",
      cost_price: cost,
      sell_price: sell,
      low_stock_threshold: threshold,
      current_stock: 0,
    })
    .select("id")
    .single();
  if (res.error) throw new Error(res.error.message);
  const productId = res.data.id as string;
  await callAdjustStock({
    productId,
    movementType: "opening_balance",
    quantity: qty,
    unitCost: cost,
  });
  return productId;
}

export async function loadSampleData(store: Store): Promise<void> {
  const boisson = await ensureCategory(store.id, "Boissons");
  const epicerie = await ensureCategory(store.id, "Épicerie");

  await insertProduct(store.id, "Coca-Cola 1L", boisson.id, 120, 150, 12, 24);
  await insertProduct(store.id, "Eau minérale 1,5L", boisson.id, 35, 50, 20, 48);
  await insertProduct(store.id, "Farine 1kg", epicerie.id, 95, 120, 8, 15);
  await insertProduct(store.id, "Huile 1L", epicerie.id, 380, 450, 6, 8);
  await insertProduct(store.id, "Sucre 1kg", epicerie.id, 105, 125, 10, 3);

  const customerRes = await supabase
    .from("carnet_customers")
    .insert({ store_id: store.id, full_name: "Ahmed Benali", phone: "0550112233" })
    .select("id")
    .single();
  if (customerRes.error) throw new Error(customerRes.error.message);
  await callRecordCarnetTransaction({
    customerId: customerRes.data.id as string,
    type: "credit",
    amount: 2500,
    note: "Crédit de départ (exemple)",
  });
  await callRecordCarnetTransaction({
    customerId: customerRes.data.id as string,
    type: "payment",
    amount: 1000,
    note: "Acompte (exemple)",
  });
}