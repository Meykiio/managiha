import { supabase } from "./supabaseClient";
import type { SalesSummary, TopProduct, DeadStockRow, ReorderRow } from "./types";

/**
 * The owner's questions, answered by Postgres.
 *
 * All four aggregate over the append-only movement ledger. Doing this in the
 * client would mean fetching every movement in the period to add up three
 * numbers, which stops working the moment a shop has a year of history.
 */

export async function fetchSalesSummary(from: string, to: string): Promise<SalesSummary> {
  const { data, error } = await supabase.rpc("get_sales_summary", {
    p_from: from,
    p_to: to,
  });
  if (error) throw new Error(error.message);
  return data as SalesSummary;
}

export async function fetchTopProducts(
  from: string,
  to: string,
  limit = 20
): Promise<TopProduct[]> {
  const { data, error } = await supabase.rpc("get_top_products", {
    p_from: from,
    p_to: to,
    p_limit: limit,
  });
  if (error) throw new Error(error.message);
  return (data ?? []) as TopProduct[];
}

export async function fetchDeadStock(days = 90, limit = 50): Promise<DeadStockRow[]> {
  const { data, error } = await supabase.rpc("get_dead_stock", {
    p_days: days,
    p_limit: limit,
  });
  if (error) throw new Error(error.message);
  return (data ?? []) as DeadStockRow[];
}

export async function fetchReorderList(lookbackDays = 30): Promise<ReorderRow[]> {
  const { data, error } = await supabase.rpc("get_reorder_list", {
    p_lookback_days: lookbackDays,
  });
  if (error) throw new Error(error.message);
  return (data ?? []) as ReorderRow[];
}

/** ISO date `n` days before today, for the period presets. */
export function daysAgoIso(days: number): string {
  const d = new Date();
  d.setDate(d.getDate() - days);
  return d.toISOString().slice(0, 10);
}

export function todayIsoDate(): string {
  return new Date().toISOString().slice(0, 10);
}
