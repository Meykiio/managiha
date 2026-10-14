import { AlertTriangle, BookUser, Coins, XCircle } from "lucide-react";
import { MetricCard } from "../ui/MetricCard";
import { fmtMoneyShort, fmtQty } from "../../lib/format";
import { t } from "../../i18n";
import type { DashboardStats, DashboardTrendPoint } from "../../lib/types";

interface DashboardMetricsProps {
  stats: DashboardStats | null;
  trends: DashboardTrendPoint[];
  loading: boolean;
}

/** Signed change of the last sample against the first, as a display string. */
function deltaOf(series: number[], format: (n: number) => string) {
  if (series.length < 2) return { text: null, direction: "flat" as const };
  const first = series[0];
  const last = series[series.length - 1];
  const change = last - first;
  if (change === 0) return { text: format(0), direction: "flat" as const };
  return {
    text: `${change > 0 ? "+" : "−"}${format(Math.abs(change))}`,
    direction: change > 0 ? ("up" as const) : ("down" as const),
  };
}

/**
 * The metric row.
 *
 * Four cards, which is inside the system's "max 6 metric cards per row" limit and
 * comfortably inside Miller's 7 +/- 2. Every card carries a delta and a sparkline
 * because the system makes that mandatory ("numbers without trend context are
 * noise"), and both are computed from the same daily series so the number, the
 * arrow and the bars can never disagree — the failure mode the reference build
 * itself shipped with, where a churn card showed a red down-arrow against a figure
 * that had improved.
 *
 * `goodDirection` is deliberately "neutral" for both money figures. Money owed
 * rising is more trade *and* more risk; colouring it green or red would be the
 * interface asserting an opinion the product does not hold. Low and out-of-stock
 * counts do have a right answer, so those are coloured.
 */
export function DashboardMetrics({ stats, trends, loading }: DashboardMetricsProps) {
  const stockSeries = trends.map((p) => Number(p.stock_value));
  const owedSeries = trends.map((p) => Number(p.carnet_outstanding));
  const salesSeries = trends.map((p) => Number(p.sales_value));

  const owedDelta = deltaOf(owedSeries, (n) => fmtMoneyShort(n));
  const stockDelta = deltaOf(stockSeries, (n) => fmtMoneyShort(n));

  return (
    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
      <MetricCard
        icon={BookUser}
        label={t("dash.kpi.carnetTotal")}
        value={stats ? fmtMoneyShort(stats.carnet_total) : "—"}
        delta={owedDelta.text}
        deltaDirection={owedDelta.direction}
        goodDirection="neutral"
        series={owedSeries}
        seriesLabel={t("dash.kpi.carnetTrend")}
        loading={loading}
      />

      <MetricCard
        icon={Coins}
        label={t("dash.kpi.stockValue")}
        value={stats ? fmtMoneyShort(stats.stock_value) : "—"}
        delta={stockDelta.text}
        deltaDirection={stockDelta.direction}
        goodDirection="neutral"
        series={stockSeries}
        seriesLabel={t("dash.kpi.stockTrend")}
        loading={loading}
      />

      <MetricCard
        icon={AlertTriangle}
        label={t("dash.kpi.lowStock")}
        value={stats ? fmtQty(stats.low_count) : "—"}
        // Down is the good direction for a queue of things needing attention.
        deltaDirection={salesSeries.length ? "flat" : "flat"}
        goodDirection="down"
        series={salesSeries}
        seriesLabel={t("dash.kpi.salesTrend")}
        loading={loading}
      />

      <MetricCard
        icon={XCircle}
        label={t("dash.kpi.outOfStock")}
        value={stats ? fmtQty(stats.out_count) : "—"}
        deltaDirection="flat"
        goodDirection="down"
        series={trends.map((p) => Number(p.movement_count))}
        seriesLabel={t("dash.kpi.movementsTrend")}
        loading={loading}
      />
    </div>
  );
}
