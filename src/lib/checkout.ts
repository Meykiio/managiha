import { supabase } from "./supabaseClient";
import { fmtMoney } from "./format";
import type { ScanCartItem } from "../hooks/useScanCart";

export interface CheckoutItem {
  productId: string;
  name: string;
  quantity: number;
  priceAtScan: number;
  priceAtCheckout: number;
  currentStock: number;
  stockOk: boolean;
}

export interface CheckoutValidation {
  ok: boolean;
  items: CheckoutItem[];
  priceChanged: boolean;
  stockIssues: string[];
}

export async function validateCheckout(
  items: ScanCartItem[]
): Promise<CheckoutValidation> {
  if (items.length === 0) {
    return { ok: false, items: [], priceChanged: false, stockIssues: [] };
  }

  const ids = items.map((i) => i.product.id);

  const { data, error } = await supabase
    .from("products")
    .select("id, name, sell_price, current_stock")
    .in("id", ids);

  if (error) {
    throw new Error(error.message);
  }

  const dbProducts = new Map(
    (data ?? []).map((p) => [p.id, p as { name: string; sell_price: number; current_stock: number }])
  );

  const result: CheckoutItem[] = [];
  const stockIssues: string[] = [];
  let priceChanged = false;

  for (const item of items) {
    const db = dbProducts.get(item.product.id);
    const priceAtCheckout = db?.sell_price ?? item.product.sell_price;
    const currentStock = db?.current_stock ?? 0;
    const stockOk = currentStock >= item.quantity;

    if (db && db.sell_price !== item.product.sell_price) {
      priceChanged = true;
    }
    if (!stockOk) {
      stockIssues.push(
        `${item.product.name} : stock ${currentStock} < besoin ${item.quantity}`
      );
    }

    result.push({
      productId: item.product.id,
      name: item.product.name,
      quantity: item.quantity,
      priceAtScan: item.product.sell_price,
      priceAtCheckout,
      currentStock,
      stockOk,
    });
  }

  return {
    ok: stockIssues.length === 0,
    items: result,
    priceChanged,
    stockIssues,
  };
}

export function getTotalFromValidated(items: CheckoutItem[]): number {
  return items.reduce((sum, i) => sum + i.priceAtCheckout * i.quantity, 0);
}
