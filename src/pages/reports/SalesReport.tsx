import { useCallback, useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { TrendingUp } from "lucide-react";
import { useToast } from "../../contexts/ToastContext";
import { Button } from "../../components/ui/Button";
import { Card } from "../../components/ui/Card";
import { EmptyState } from "../../components/ui/EmptyState";
import { Stat } from "../../components/ui/Stat";
import { Tabs } from "../../components/ui/Tabs";
import { fetchDeadStock, fetchSalesSummary, fetchTopProducts, daysAgoIso, todayIsoDate } from "../../lib/insights";
import { fmtMoney, fmtQty, fmtDate } from "../../lib/format";
import { unitShort } from "../../lib/constants";
import { downloadCsv, todayIso } from "../../lib/csv";
import type { DeadStockRow, SalesSummary, TopProduct } from "../../lib/types";
import { t } from "../../i18n";

type Period = "d7" | "d30" | "d90";
const PERIOD_DAYS: Record<Period, number> = { d7: 7, d30: 30, d90: 90 };
const DEAD_STOCK_DAYS = 90;

const EMPTY_SUMMARY: SalesSummary = {
  revenue: 0,
  units: 0,
  sale_count: 0,
  cogs_estimated: 0,
  margin_estimated: 0,
};

/**
 * What sold, what it earned, and what has stopped moving.
 *
 * Two things stated plainly in the interface rather than buried: the margin is an
 * estimate, because a sale movement records what was charged and not what was
 * paid; and dead stock is measured from the first receipt, so a product that
 * arrived last week is not called a slow mover.
 *
 * This is reporting over sales already recorded. It is not a caisse closure — no
 * opening float, no cash count, no reconciliation — because those are what make
 * software a "système de caisse" under the 2027 rule this product stays out of.
 */
export default function SalesReport() {
  const { showToast } = useToast();
  const [period, setPeriod] = useState<Period>("d30");
  const [summary, setSummary] = useState<SalesSummary>(EMPTY_SUMMARY);
  const [top, setTop] = useState<TopProduct[]>([]);
  const [dead, setDead] = useState<DeadStockRow[]>([]);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    setLoading(true);
    const from = daysAgoIso(PERIOD_DAYS[period]);
    const to = todayIsoDate();
    try {
      const [s, tp, ds] = await Promise.all([
        fetchSalesSummary(from, to),
        fetchTopProducts(from, to, 20),
        // Dead stock ignores the period tabs on purpose: "has not sold in 90 days"
        // is not a question that means anything over a 7-day window.
        fetchDeadStock(DEAD_STOCK_DAYS, 50),
      ]);
      setSummary(s ?? EMPTY_SUMMARY);
      setTop(tp);
      setDead(ds);
    } catch (err) {
      showToast(err instanceof Error ? err.message : t("common.error"), "error");
      setSummary(EMPTY_SUMMARY);
      setTop([]);
      setDead([]);
    } finally {
      setLoading(false);
    }
  }, [period, showToast]);

  useEffect(() => {
    load();
  }, [load]);

  const exportTop = () => {
    downloadCsv(
      `ventes-${todayIso()}.csv`,
      [t("csv.header.product"), t("reports.sales.units"), t("reports.sales.revenue"), t("reports.sales.margin")],
      top.map((p) => [p.name, p.units_sold, p.revenue, p.margin_est])
    );
  };

  const marginPct =
    summary.revenue > 0 ? (summary.margin_estimated / summary.revenue) * 100 : null;

  return (
    <div className="space-y-4">
      <Tabs<Period>
        tabs={[
          { key: "d7", label: t("reports.sales.period7") },
          { key: "d30", label: t("reports.sales.period30") },
          { key: "d90", label: t("reports.sales.period90") },
        ]}
        active={period}
        onChange={setPeriod}
      />

      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <Stat label={t("reports.sales.revenue")} value={fmtMoney(summary.revenue)} tone="positive" />
        <Stat label={t("reports.sales.salesCount")} value={String(summary.sale_count)} />
        <Stat
          label={t("reports.sales.units")}
          value={fmtQty(summary.units)}
        />
        <Stat
          label={t("reports.sales.margin")}
          value={fmtMoney(summary.margin_estimated)}
          detail={
            marginPct == null
              ? t("reports.sales.marginEstimated")
              : t("reports.sales.marginPercentEstimated", { percent: marginPct.toFixed(0) })
          }
          tone={summary.margin_estimated < 0 ? "danger" : "neutral"}
        />
      </div>

      <Card
        title={t("reports.sales.topProducts")}
        action={
          <Button variant="secondary" onClick={exportTop} disabled={top.length === 0}>
            {t("common.exportCsv")}
          </Button>
        }
        bodyClassName={loading ? "" : "px-0 pb-0"}
      >
        {loading ? (
          <SkeletonRows />
        ) : top.length === 0 ? (
          <EmptyState icon={TrendingUp} title={t("reports.sales.noSales")} body="" />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-line bg-bg text-xs font-semibold uppercase tracking-wide text-body-muted">
                  <th scope="col" className="px-5 py-3 text-start">{t("reports.sales.product")}</th>
                  <th scope="col" className="px-3 py-3 text-end">{t("reports.sales.units")}</th>
                  <th scope="col" className="px-3 py-3 text-end">{t("reports.sales.revenue")}</th>
                  <th scope="col" className="px-5 py-3 text-end hidden sm:table-cell">
                    {t("reports.sales.margin")}
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-line">
                {top.map((p) => (
                  <tr key={p.product_id} className="hover:bg-surface-mid/60">
                    <td className="max-w-[16rem] truncate px-5 py-3 font-medium text-body">
                      <Link to={`/products/${p.product_id}`} className="hover:text-primary hover:underline">
                        {p.name}
                      </Link>
                    </td>
                    <td className="tnum px-3 py-3 text-end text-body-soft">
                      {fmtQty(p.units_sold)} {unitShort(p.unit)}
                    </td>
                    <td className="tnum px-3 py-3 text-end font-medium text-body">
                      {fmtMoney(p.revenue)}
                    </td>
                    <td className="tnum px-5 py-3 text-end hidden sm:table-cell">
                      <span className={p.margin_est < 0 ? "text-error-fg" : "text-body-soft"}>
                        {fmtMoney(p.margin_est)}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Card>

      <Card
        title={t("reports.sales.deadStock")}
        bodyClassName={loading ? "" : "px-0 pb-0"}
      >
        {loading ? (
          <SkeletonRows />
        ) : dead.length === 0 ? (
          <div className="px-5 py-6">
            <p className="text-sm text-body-muted">
              {t("reports.sales.deadEmpty", { days: DEAD_STOCK_DAYS })}
            </p>
          </div>
        ) : (
          <>
            <p className="px-5 pb-2 text-xs text-body-muted">
              {t("reports.sales.deadHint", { days: DEAD_STOCK_DAYS })}
            </p>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-line bg-bg text-xs font-semibold uppercase tracking-wide text-body-muted">
                    <th scope="col" className="px-5 py-3 text-start">{t("reports.sales.product")}</th>
                    <th scope="col" className="px-3 py-3 text-end">{t("reports.sales.inStock")}</th>
                    <th scope="col" className="px-3 py-3 text-end">{t("reports.sales.valueTiedUp")}</th>
                    <th scope="col" className="px-5 py-3 text-end">{t("reports.sales.lastSold")}</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-line">
                  {dead.map((d) => (
                    <tr key={d.product_id} className="hover:bg-surface-mid/60">
                      <td className="max-w-[16rem] truncate px-5 py-3 font-medium text-body">
                        <Link to={`/products/${d.product_id}`} className="hover:text-primary hover:underline">
                          {d.name}
                        </Link>
                      </td>
                      <td className="tnum px-3 py-3 text-end text-body-soft">
                        {fmtQty(d.current_stock)} {unitShort(d.unit)}
                      </td>
                      <td className="tnum px-3 py-3 text-end font-medium text-body">
                        {fmtMoney(d.value_tied_up)}
                      </td>
                      <td className="whitespace-nowrap px-5 py-3 text-end text-body-soft">
                        {d.last_sold_at
                          ? fmtDate(d.last_sold_at)
                          : t("reports.sales.neverSold")}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </>
        )}
      </Card>
    </div>
  );
}

function SkeletonRows() {
  return (
    <div className="space-y-3 p-5">
      {Array.from({ length: 4 }).map((_, i) => (
        <div key={i} className="h-10 animate-pulse rounded-lg bg-surface-high" />
      ))}
    </div>
  );
}
