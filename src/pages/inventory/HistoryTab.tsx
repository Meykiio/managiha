import { useCallback, useEffect, useState } from "react";
import { Download } from "lucide-react";
import { supabase } from "../../lib/supabaseClient";
import { useAuth } from "../../contexts/AuthContext";
import { useToast } from "../../contexts/ToastContext";
import { Input } from "../../components/ui/Input";
import { Select } from "../../components/ui/Select";
import { Button } from "../../components/ui/Button";
import { EmptyState } from "../../components/ui/EmptyState";
import { Pagination } from "../../components/ui/Pagination";
import { ProductSelect } from "../../components/inventory/ProductSelect";
import { downloadCsv } from "../../lib/csv";
import { fmtDateTime, fmtQty, signedQty } from "../../lib/format";
import { unitShort } from "../../lib/constants";
import { MOVEMENT_TYPES, movementLabel } from "../../lib/constants";
import type { StockMovementWithProduct } from "../../lib/types";
import { PAGE_SIZE } from "../../lib/constants";
import { t } from "../../i18n";

export default function HistoryTab() {
  const { store } = useAuth();
  const { showToast } = useToast();
  const [productId, setProductId] = useState<string | null>(null);
  const [typeFilter, setTypeFilter] = useState("");
  const [fromDate, setFromDate] = useState("");
  const [toDate, setToDate] = useState("");
  const [page, setPage] = useState(1);

  const [rows, setRows] = useState<StockMovementWithProduct[]>([]);
  const [count, setCount] = useState(0);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setPage(1);
  }, [productId, typeFilter, fromDate, toDate]);

  const load = useCallback(async () => {
    if (!store) return;
    setLoading(true);
    try {
      let query = supabase
        .from("stock_movements")
        .select("*, product:products(id, name, unit)", { count: "exact" })
        .eq("store_id", store.id);
      if (productId) query = query.eq("product_id", productId);
      if (typeFilter) query = query.eq("movement_type", typeFilter);
      if (fromDate) query = query.gte("created_at", `${fromDate}T00:00:00`);
      if (toDate) query = query.lte("created_at", `${toDate}T23:59:59`);
      const from = (page - 1) * PAGE_SIZE;
      const { data, error, count: total } = await query
        .order("created_at", { ascending: false })
        .range(from, from + PAGE_SIZE - 1);
      if (error) throw new Error(error.message);
      setRows((data ?? []) as unknown as StockMovementWithProduct[]);
      setCount(total ?? 0);
    } catch (err) {
      showToast(err instanceof Error ? err.message : t("common.error"), "error");
    } finally {
      setLoading(false);
    }
  }, [store, productId, typeFilter, fromDate, toDate, page, showToast]);

  useEffect(() => {
    load();
  }, [load]);

  const handleExport = () => {
    downloadCsv(
      `mouvements-stock-${new Date().toISOString().slice(0, 10)}.csv`,
      ["Produit", "Type", "Quantité", "Motif", "Note", "Date"],
      rows.map((m) => [
        m.product?.name ?? "",
        movementLabel(m.movement_type),
        Number(m.quantity),
        m.reason ?? "",
        m.note ?? "",
        fmtDateTime(m.created_at),
      ])
    );
  };

  if (!store) return null;

  return (
    <div className="space-y-4">
      <div className="grid gap-3 lg:grid-cols-5">
        <ProductSelect storeId={store.id} value={productId} onChange={setProductId} />
        <Select value={typeFilter} onChange={(e) => setTypeFilter(e.target.value)} aria-label={t("inventory.history.table.type")}>
          <option value="">{t("inventory.history.allTypes")}</option>
          {MOVEMENT_TYPES.map((m) => (
            <option key={m.value} value={m.value}>
              {m.label}
            </option>
          ))}
        </Select>
        <Input type="date" aria-label={t("common.from")} value={fromDate} onChange={(e) => setFromDate(e.target.value)} />
        <Input type="date" aria-label={t("common.to")} value={toDate} onChange={(e) => setToDate(e.target.value)} />
        <Button variant="secondary" onClick={handleExport}>
          <Download className="h-4 w-4" />
          {t("common.exportCsv")}
        </Button>
      </div>

      <div className="rounded-xl border border-neutral-200 bg-white shadow-card">
        {loading ? (
          <div className="space-y-3 p-5">
            {Array.from({ length: 6 }).map((_, i) => (
              <div key={i} className="h-10 animate-pulse rounded-lg bg-neutral-100" />
            ))}
          </div>
        ) : rows.length === 0 ? (
          <EmptyState icon={Download} title={t("inventory.history.empty")} body="" compact />
        ) : (
          <>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-neutral-200 bg-neutral-50 text-xs font-semibold uppercase tracking-wide text-neutral-500">
                    <th className="px-5 py-3 text-start">{t("inventory.history.table.product")}</th>
                    <th className="px-3 py-3 text-start">{t("inventory.history.table.type")}</th>
                    <th className="px-3 py-3 text-start">{t("inventory.history.table.qty")}</th>
                    <th className="px-3 py-3 text-start hidden md:table-cell">{t("inventory.history.table.reason")}</th>
                    <th className="px-5 py-3 text-end">{t("common.date")}</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-neutral-100">
                  {rows.map((m) => (
                    <tr key={m.id} className="hover:bg-neutral-50/60">
                      <td className="max-w-[14rem] truncate px-5 py-3.5 font-medium text-neutral-900">
                        {m.product?.name ?? "—"}
                      </td>
                      <td className="px-3 py-3.5 text-neutral-700">{movementLabel(m.movement_type)}</td>
                      <td
                        className={`tnum whitespace-nowrap px-3 py-3.5 font-semibold ${
                          Number(m.quantity) >= 0 ? "text-emerald-600" : "text-red-600"
                        }`}
                      >
                        {signedQty(Number(m.quantity))} {unitShort(m.product?.unit ?? "piece")}
                      </td>
                      <td className="hidden max-w-[16rem] truncate px-3 py-3.5 text-neutral-500 md:table-cell">
                        {[m.reason, m.note].filter(Boolean).join(" — ") || "—"}
                      </td>
                      <td className="whitespace-nowrap px-5 py-3.5 text-end text-neutral-500">
                        {fmtDateTime(m.created_at)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <div className="px-5 pb-4 pt-1">
              <Pagination page={page} totalPages={Math.max(1, Math.ceil(count / PAGE_SIZE))} onChange={setPage} />
            </div>
          </>
        )}
      </div>

      <p className="text-xs text-neutral-400 tnum">
        {count > 0 ? `${fmtQty(count)} mouvement(s)` : ""}
      </p>
    </div>
  );
}
