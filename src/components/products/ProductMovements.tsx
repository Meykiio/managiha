import { useCallback, useEffect, useState } from "react";
import { History } from "lucide-react";
import { supabase } from "../../lib/supabaseClient";
import { useToast } from "../../contexts/ToastContext";
import { Card } from "../ui/Card";
import { EmptyState } from "../ui/EmptyState";
import { Pagination } from "../ui/Pagination";
import { Skeleton } from "../ui/Spinner";
import type { StockMovement } from "../../lib/types";
import { fmtDateTime, signedQty } from "../../lib/format";
import { PAGE_SIZE, movementLabel } from "../../lib/constants";
import { t } from "../../i18n";

interface ProductMovementsProps {
  productId: string;
  reloadKey?: number;
}

export function ProductMovements({ productId, reloadKey = 0 }: ProductMovementsProps) {
  const { showToast } = useToast();
  const [movements, setMovements] = useState<StockMovement[]>([]);
  const [count, setCount] = useState(0);
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setPage(1);
  }, [productId]);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const from = (page - 1) * PAGE_SIZE;
      const { data, error, count: total } = await supabase
        .from("stock_movements")
        .select("*", { count: "exact" })
        .eq("product_id", productId)
        .order("created_at", { ascending: false })
        .range(from, from + PAGE_SIZE - 1);
      if (error) throw new Error(error.message);
      setMovements((data ?? []) as StockMovement[]);
      setCount(total ?? 0);
    } catch (err) {
      showToast(err instanceof Error ? err.message : t("common.error"), "error");
      setMovements([]);
    } finally {
      setLoading(false);
    }
  }, [productId, page, showToast]);

  useEffect(() => {
    load();
  }, [load, reloadKey]);

  return (
    <Card title={t("productDetail.history")} bodyClassName="px-0 pb-2 pt-1">
      {loading ? (
        <div className="space-y-2.5 px-5 py-3">
          {Array.from({ length: 5 }).map((_, i) => (
            <Skeleton key={i} className="h-10 w-full" />
          ))}
        </div>
      ) : movements.length === 0 ? (
        <EmptyState compact icon={History} title={t("productDetail.emptyHistory")} body="" />
      ) : (
        <>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-neutral-200 bg-neutral-50 text-xs font-semibold uppercase tracking-wide text-neutral-500">
                  <th className="px-5 py-3 text-start">{t("productDetail.movement")}</th>
                  <th className="px-3 py-3 text-start">{t("productDetail.qty")}</th>
                  <th className="px-3 py-3 text-start hidden sm:table-cell">{t("common.reason")}</th>
                  <th className="px-5 py-3 text-end">{t("common.date")}</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-neutral-100">
                {movements.map((m) => (
                  <tr key={m.id} className="hover:bg-neutral-50/60">
                    <td className="px-5 py-3 font-medium text-neutral-800">
                      {movementLabel(m.movement_type)}
                    </td>
                    <td
                      className={`tnum whitespace-nowrap px-3 py-3 font-semibold ${
                        Number(m.quantity) >= 0 ? "text-emerald-600" : "text-red-600"
                      }`}
                    >
                      {signedQty(Number(m.quantity))}
                    </td>
                    <td className="hidden max-w-[16rem] truncate px-3 py-3 text-neutral-500 sm:table-cell">
                      {[m.reason, m.note].filter(Boolean).join(" — ") || "—"}
                    </td>
                    <td className="px-5 py-3 text-end text-neutral-500">{fmtDateTime(m.created_at)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <div className="px-5 pb-2 pt-1">
            <Pagination page={page} totalPages={Math.max(1, Math.ceil(count / PAGE_SIZE))} onChange={setPage} />
          </div>
        </>
      )}
    </Card>
  );
}