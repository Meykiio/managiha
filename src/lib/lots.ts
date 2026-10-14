import { supabase } from "./supabaseClient";
import type { ExpiryRow, ProductLot } from "./types";

/**
 * Lot reads.
 *
 * product_lots has a SELECT policy and no write policy at all, so nothing in the
 * client can change a lot quantity. Every mutation goes through adjust_stock() or
 * checkout_sale(). Keeping the reads here, apart from api.ts, also keeps that
 * file under the 250-line limit and makes it obvious at a glance that this
 * module is read-only.
 */

/**
 * Open lots for a product, earliest expiry first, with undated lots last. This is
 * the same order the server uses to allocate a sale (FEFO), so what the shopkeeper
 * sees listed is what the next sale will actually consume.
 */
export async function fetchProductLots(productId: string): Promise<ProductLot[]> {
  const { data, error } = await supabase
    .from("product_lots")
    .select(
      "id, product_id, expiry_date, lot_code, quantity, unit_cost, received_at, closed_at"
    )
    .eq("product_id", productId)
    // Exactly allocate_lots_fefo's ordering, including the final tiebreak on id,
    // so the "next to sell" badge cannot disagree with what a sale consumes when
    // two deliveries share an expiry date and a received_at.
    .order("expiry_date", { ascending: true, nullsFirst: false })
    .order("received_at", { ascending: true })
    .order("id", { ascending: true });
  if (error) throw new Error(error.message);
  return (data ?? []) as ProductLot[];
}

/**
 * Dated open lots for one store, soonest first.
 *
 * `withinDays` narrows to what will expire by then; omit it for the whole dated
 * shelf. The ordering is the server's, and it is the same order FEFO picks from,
 * so the top of this list is what the next sale consumes.
 */
export async function fetchExpiryReport(
  storeId: string,
  withinDays?: number,
  limit = 200
): Promise<ExpiryRow[]> {
  let query = supabase
    .from("expiry_report")
    .select("*")
    .eq("store_id", storeId)
    .order("expiry_date", { ascending: true });
  if (withinDays !== undefined) {
    const cutoff = new Date();
    cutoff.setDate(cutoff.getDate() + withinDays);
    query = query.lte("expiry_date", cutoff.toISOString().slice(0, 10));
  }
  const { data, error } = await query.limit(limit);
  if (error) throw new Error(error.message);
  return (data ?? []) as ExpiryRow[];
}

/** Expiry urgency bands, matching how shops actually act on a date. */
export type ExpiryBucket = "expired" | "critical" | "soon" | "later";

export function expiryBucket(daysLeft: number): ExpiryBucket {
  if (daysLeft < 0) return "expired";
  if (daysLeft <= 3) return "critical";
  if (daysLeft <= 7) return "soon";
  return "later";
}