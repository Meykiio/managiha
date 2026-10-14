import { supabase } from "./supabaseClient";
import type { MovementType, TransactionType } from "./types";

/**
 * Write RPCs.
 *
 * Split out of api.ts, which is otherwise reads. This module is the only place
 * that writes to the database, and every call in it is a SECURITY DEFINER Postgres
 * function: stock and carnet balances are never computed in the browser. Keeping
 * them together makes that boundary obvious when reading the file list.
 */

export interface CheckoutItem {
  product_id: string;
  quantity: number;
}

export interface CheckoutResult {
  total: number;
  change: number;
  /** One entry per stock movement, so a sale spanning two lots returns two. */
  movement_ids: string[];
  items_count: number;
}

export interface AdjustStockInput {
  productId: string;
  movementType: MovementType;
  quantity: number;
  unitCost?: number | null;
  reason?: string | null;
  note?: string | null;
  /** Makes the call replay-safe. A retried write returns the first result. */
  clientOpId?: string | null;
  /**
   * Lots. `lotId` targets an existing delivery; `expiryDate` plus `lotCode`
   * identify a delivery and are consulted only when `lotId` is omitted. The server
   * resolves or creates the lot, never the client.
   */
  lotId?: string | null;
  expiryDate?: string | null;
  lotCode?: string | null;
}

export async function callAdjustStock(input: AdjustStockInput): Promise<string> {
  const { data, error } = await supabase.rpc("adjust_stock", {
    p_product_id: input.productId,
    p_movement_type: input.movementType,
    p_quantity: input.quantity,
    p_unit_cost: input.unitCost ?? null,
    p_reason: input.reason ?? null,
    p_note: input.note ?? null,
    p_client_op_id: input.clientOpId ?? null,
    p_lot_id: input.lotId ?? null,
    p_expiry_date: input.expiryDate ?? null,
    p_lot_code: input.lotCode ?? null,
  });
  if (error) throw new Error(error.message);
  return data as string;
}

export async function callRecordCarnetTransaction(input: {
  customerId: string;
  type: TransactionType;
  amount: number;
  note?: string | null;
  clientOpId?: string | null;
}): Promise<string> {
  const { data, error } = await supabase.rpc("record_carnet_transaction", {
    p_customer_id: input.customerId,
    p_type: input.type,
    p_amount: input.amount,
    p_note: input.note ?? null,
    p_client_op_id: input.clientOpId ?? null,
  });
  if (error) throw new Error(error.message);
  return data as string;
}

/**
 * p_items carries no price on purpose: the server reads products.sell_price, so a
 * tampered client cannot decide what something costs. p_client_op_id makes the call
 * replay-safe, so retrying after a network error cannot sell twice.
 */
export async function callCheckoutSale(
  items: CheckoutItem[],
  paymentMode: "cash" | "credit",
  clientOpId: string,
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
    p_client_op_id: clientOpId,
  });
  if (error) throw new Error(error.message);
  return data as CheckoutResult;
}