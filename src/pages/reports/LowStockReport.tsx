import { useEffect, useState } from "react";
import { Download, ShieldAlert } from "lucide-react";
import { useAuth } from "../../contexts/AuthContext";
import { Button } from "../../components/ui/Button";
import { Card } from "../../components/ui/Card";
import { EmptyState } from "../../components/ui/EmptyState";
import { Badge, stockStatusTone } from "../../components/ui/Badge";
import { fetchLowStockProducts } from "../../lib/api";
import { downloadCsv } from "../../lib/csv";
import type { ProductOverview } from "../../lib/types";
import { fmtQty } from "../../lib/format";
import { unitShort } from "../../lib/constants";
import { t } from "../../i18n";

const STATUS_LABEL: Record<string, string> = {
  healthy: "",
  low: t("products.status.low"),
  out: t("products.status.out"),
};

export default function LowStockReport() {
  const { store } = useAuth();
  const [rows, setRows] = useState<ProductOverview[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!store) return;
    fetchLowStockProducts(store.id, 500)
      .then(setRows)
      .catch(() => setRows([]))
      .finally(() => setLoading(false));
  }, [store]);

  const handleExport = () => {
    downloadCsv(
      `stock-faible-${new Date().toISOString().slice(0, 10)}.csv`,
      ["Produit", "Stock actuel", "Seuil", "Statut"],
      rows.map((p) => [
        p.name,
        Number(p.current_stock),
        p.low_stock_threshold != null ? Number(p.low_stock_threshold) : "",
        STATUS_LABEL[p.stock_status],
      ])
    );
  };

  if (loading) {
    return (
      <div className="space-y-3 p-5">
        {Array.from({ length: 5 }).map((_, i) => (
          <div key={i} className="h-10 animate-pulse rounded-lg bg-neutral-100" />
        ))}
      </div>
    );
  }

  if (rows.length === 0) {
    return (
      <Card>
        <EmptyState icon={ShieldAlert} title={t("reports.lowStock.empty")} body="" />
      </Card>
    );
  }

  return (
    <Card
      action={
        <Button variant="secondary" onClick={handleExport}>
          <Download className="h-4 w-4" />
          {t("common.exportCsv")}
        </Button>
      }
      bodyClassName="px-0 pb-0"
    >
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-neutral-200 bg-neutral-50 text-xs font-semibold uppercase tracking-wide text-neutral-500">
              <th className="px-5 py-3 text-start">{t("reports.lowStock.product")}</th>
              <th className="px-3 py-3 text-start">{t("reports.lowStock.stock")}</th>
              <th className="px-3 py-3 text-start">{t("reports.lowStock.threshold")}</th>
              <th className="px-5 py-3 text-end">{t("reports.lowStock.status")}</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-neutral-100">
            {rows.map((p) => (
              <tr key={p.id} className="hover:bg-neutral-50/60">
                <td className="max-w-[18rem] truncate px-5 py-3.5 font-medium text-neutral-900">
                  {p.name}
                </td>
                <td className="tnum px-3 py-3.5 whitespace-nowrap text-neutral-700">
                  {fmtQty(p.current_stock)} {unitShort(p.unit)}
                </td>
                <td className="tnum px-3 py-3.5 text-neutral-600">
                  {p.low_stock_threshold != null ? fmtQty(Number(p.low_stock_threshold)) : "—"}
                </td>
                <td className="px-5 py-3.5 text-end">
                  <Badge tone={stockStatusTone(p.stock_status)} dot>
                    {STATUS_LABEL[p.stock_status]}
                  </Badge>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </Card>
  );
}
