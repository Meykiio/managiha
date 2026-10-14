import { useEffect, useState } from "react";
import { Download, Layers } from "lucide-react";
import { supabase } from "../../lib/supabaseClient";
import { useAuth } from "../../contexts/AuthContext";
import { Button } from "../../components/ui/Button";
import { Card } from "../../components/ui/Card";
import { EmptyState } from "../../components/ui/EmptyState";
import { downloadCsv } from "../../lib/csv";
import type { Product, Category } from "../../lib/types";
import { fmtMoney, fmtMoneyShort, fmtQty } from "../../lib/format";
import { unitShort } from "../../lib/constants";
import { t } from "../../i18n";

export default function StockValueReport() {
  const { store } = useAuth();
  const [rows, setRows] = useState<Product[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!store) return;
    (async () => {
      try {
        let all: Product[] = [];
        const pageSize = 1000;
        for (let from = 0; ; from += pageSize) {
          const res = await supabase
            .from("products")
            .select("*")
            .eq("store_id", store.id)
            .eq("active", true)
            .is("archived_at", null)
            .order("name")
            .range(from, from + pageSize - 1);
          if (res.error) throw new Error(res.error.message);
          all = all.concat((res.data ?? []) as Product[]);
          if ((res.data ?? []).length < pageSize) break;
        }
        setRows(all);
      } catch {
        setRows([]);
      } finally {
        setLoading(false);
      }
    })();
    supabase
      .from("categories")
      .select("*")
      .eq("store_id", store.id)
      .limit(500)
      .then(({ data }) => setCategories((data ?? []) as Category[]));
  }, [store]);

  const totalValue = rows.reduce(
    (sum, p) => sum + Number(p.cost_price) * Number(p.current_stock),
    0
  );

  const handleExport = () => {
    downloadCsv(
      `valeur-stock-${new Date().toISOString().slice(0, 10)}.csv`,
      [
        t("csv.header.product"),
        t("csv.header.category"),
        t("csv.header.quantity"),
        t("csv.header.costPrice"),
        t("csv.header.value"),
      ],
      rows.map((p) => [
        p.name,
        categories.find((c) => c.id === p.category_id)?.name ?? "",
        Number(p.current_stock),
        Number(p.cost_price),
        Number(p.cost_price) * Number(p.current_stock),
      ])
    );
  };

  if (loading) {
    return (
      <div className="space-y-3 p-5">
        {Array.from({ length: 6 }).map((_, i) => (
          <div key={i} className="h-10 animate-pulse rounded-lg bg-surface-high" />
        ))}
      </div>
    );
  }

  return (
    <Card
      title={t("reports.stockValue.totalValue") + " : " + fmtMoneyShort(totalValue)}
      action={
        rows.length > 0 ? (
          <Button variant="secondary" onClick={handleExport}>
            <Download className="h-4 w-4" />
            {t("common.exportCsv")}
          </Button>
        ) : undefined
      }
      bodyClassName="px-0 pb-0"
    >
      {rows.length === 0 ? (
        <EmptyState icon={Layers} title={t("reports.stockValue.empty")} body="" />
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-line bg-bg text-xs font-semibold uppercase tracking-wide text-body-muted">
                <th className="px-5 py-3 text-start">{t("reports.stockValue.product")}</th>
                <th className="px-3 py-3 text-start hidden md:table-cell">{t("reports.stockValue.category")}</th>
                <th className="px-3 py-3 text-start">{t("reports.stockValue.qty")}</th>
                <th className="px-3 py-3 text-start">{t("reports.stockValue.cost")}</th>
                <th className="px-5 py-3 text-end">{t("reports.stockValue.value")}</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-line">
              {rows.map((p) => (
                <tr key={p.id} className="hover:bg-surface-mid/60">
                  <td className="max-w-[16rem] truncate px-5 py-3.5 font-medium text-body">
                    {p.name}
                  </td>
                  <td className="hidden px-3 py-3.5 text-body-muted md:table-cell">
                    {categories.find((c) => c.id === p.category_id)?.name ?? "—"}
                  </td>
                  <td className="tnum whitespace-nowrap px-3 py-3.5 text-body-soft">
                    {fmtQty(p.current_stock)} {unitShort(p.unit)}
                  </td>
                  <td className="tnum whitespace-nowrap px-3 py-3.5 text-body-soft">
                    {fmtMoneyShort(p.cost_price)}
                  </td>
                  <td className="tnum whitespace-nowrap px-5 py-3.5 text-end font-semibold text-body">
                    {fmtMoney(Number(p.cost_price) * Number(p.current_stock))}
                  </td>
                </tr>
              ))}
            </tbody>
            <tfoot>
              <tr className="border-t-2 border-line bg-bg font-semibold text-body">
                <td className="px-5 py-3.5" colSpan={4}>
                  {t("reports.stockValue.totalValue")}
                </td>
                <td className="tnum whitespace-nowrap px-5 py-3.5 text-end">
                  {fmtMoney(totalValue)}
                </td>
              </tr>
            </tfoot>
          </table>
        </div>
      )}
    </Card>
  );
}
