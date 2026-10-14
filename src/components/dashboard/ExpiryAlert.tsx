import { Link } from "react-router-dom";
import { CalendarClock } from "lucide-react";
import { Card } from "../ui/Card";
import { Badge } from "../ui/Badge";
import { expiryBucket } from "../../lib/lots";
import { fmtMoney } from "../../lib/format";
import type { ExpiryRow } from "../../lib/types";
import { t } from "../../i18n";

interface ExpiryAlertProps {
  rows: ExpiryRow[];
}

/**
 * What is about to expire, and what that costs.
 *
 * Separate from NeedsAttention rather than folded into it: a product can be
 * perfectly well stocked and still be a loss, and "reorder this" and "sell this
 * before Friday" are opposite instructions. Merging them would produce a list
 * where the right action depends on which row you are reading.
 *
 * Renders nothing when there is nothing close to expiry, so it costs no space in
 * the ordinary case rather than showing an empty state nobody needs.
 */
export function ExpiryAlert({ rows }: ExpiryAlertProps) {
  if (rows.length === 0) return null;

  const atRisk = rows.reduce((sum, r) => sum + Number(r.value_at_risk), 0);
  const shown = rows.slice(0, 5);
  const overdue = rows.filter((r) => expiryBucket(r.days_left) === "expired").length;

  return (
    <Card
      title={t("dash.expiry.title")}
      action={
        <Link
          to="/reports?tab=expiry"
          className="text-sm font-medium text-primary hover:opacity-80"
        >
          {t("dash.viewAll")}
        </Link>
      }
      bodyClassName="px-0 pb-2 pt-1"
    >
      <div className="flex flex-wrap items-baseline gap-x-3 gap-y-1 px-5 pb-2">
        <span className="tnum text-lg font-semibold text-error-fg">{fmtMoney(atRisk)}</span>
        <span className="text-xs text-body-muted">{t("dash.expiry.atRisk")}</span>
        {overdue > 0 && (
          <Badge tone="danger" dot>
            {t("dash.expiry.overdue", { count: overdue })}
          </Badge>
        )}
      </div>
      <ul className="divide-y divide-line">
        {shown.map((row) => {
          const bucket = expiryBucket(row.days_left);
          return (
            <li key={row.lot_id}>
              <Link
                to={`/products/${row.product_id}`}
                className="flex items-center justify-between gap-3 px-5 py-2.5 hover:bg-surface-mid/60"
              >
                <span className="flex min-w-0 items-center gap-2">
                  <CalendarClock className="h-4 w-4 shrink-0 text-body-muted" aria-hidden="true" />
                  <span className="truncate text-sm text-body">{row.product_name}</span>
                </span>
                <span className="flex shrink-0 items-center gap-3">
                  <span className="tnum text-xs text-body-muted">{fmtMoney(row.value_at_risk)}</span>
                  <Badge tone={bucket === "later" ? "neutral" : "warning"} dot>
                    {row.days_left <= 0
                      ? t("reports.expiry.expired")
                      : t("dash.expiry.days", { count: row.days_left })}
                  </Badge>
                </span>
              </Link>
            </li>
          );
        })}
      </ul>
      {rows.length > shown.length && (
        <p className="px-5 pt-2 text-xs text-body-muted">
          {t("dash.expiry.more", { count: rows.length - shown.length })}
        </p>
      )}
    </Card>
  );
}
