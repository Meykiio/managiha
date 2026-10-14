import type { StockStatus } from "./types";

export function getStockStatus(
  currentStock: number,
  threshold: number | null | undefined
): StockStatus {
  if (currentStock <= 0) return "out";
  if (threshold != null && currentStock <= Number(threshold)) return "low";
  return "healthy";
}
