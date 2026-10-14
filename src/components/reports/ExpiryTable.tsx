import { Link } from "react-router-dom";
import { Trash2 } from "lucide-react";
import { Button } from "../ui/Button";
import { Badge, type BadgeTone } from "../ui/Badge";
import { expiryBucket, type ExpiryBucket } from "../../lib/lots";
import { fmtDate, fmtMoney, fmtQty } from "../../lib/format";
import { unitShort } from "../../lib/constants";
import type { ExpiryRow } from "../../lib/types";
import { t } from "../../i18n";

const BUCKET_TONE: Record<ExpiryBucket, BadgeTone> = {
  expired: "danger",
  critical: "danger",
  soon: "warning",
  later: "neutral",
};

interface ExpiryTableProps {
  rows: ExpiryRow[];
  onWriteOff: (row: ExpiryRow) => void;
}

/**
 * Dated lots, soonest first, with the money each one is holding.
 *
 * Every row carries the one action that matters for it. A list of dates with no
 * way to act on them is a report nobody opens twice, which is roughly what the
 * expiry tab had become.
 */
export function ExpiryTable({ rows, onWriteOff }: ExpiryTableProps) {
  const daysLabel = (row: ExpiryRow) => {
    if (row.days_left === 0) return t("reports.expiry.expiresToday");
    if (row.days_left < 0) {
      return t("reports.expiry.daysOverdue", { days: Math.abs(row.days_left) });
    }
    return String(row.days_left);
  };

  return (
    <div className="overflow-x-auto">
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b border-line bg-bg text-xs font-semibold uppercase tracking-wide text-body-muted">
            <th scope="col" className="px-5 py-3 text-start">{t("reports.lowStock.product")}</th>
            <th scope="col" className="px-3 py-3 text-start hidden md:table-cell">{t("reports.expiry.lot")}</th>
            <th scope="col" className="px-3 py-3 text-start">{t("reports.expiry.date")}</th>
            <th scope="col" className="px-3 py-3 text-start">{t("reports.expiry.daysLeft")}</th>
            <th scope="col" className="px-3 py-3 text-end">{t("reports.expiry.qty")}</th>
            <th scope="col" className="px-3 py-3 text-end">{t("reports.expiry.valueAtRisk")}</th>
            <th scope="col" className="px-5 py-3 text-end">{t("common.actions")}</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-line">
          {rows.map((row) => {
            const bucket = expiryBucket(row.days_left);
            return (
              <tr key={row.lot_id} className="hover:bg-surface-mid/60">
                <td className="max-w-[14rem] truncate px-5 py-3.5 font-medium text-body">
                  <Link
                    to={`/products/${row.product_id}`}
                    className="hover:text-primary hover:underline"
                  >
                    {row.product_name}
                  </Link>
                </td>
                <td className="px-3 py-3.5 text-body-soft hidden md:table-cell">
                  {row.lot_code ?? "—"}
                </td>
                <td className="whitespace-nowrap px-3 py-3.5 text-body-soft">
                  {fmtDate(row.expiry_date)}
                </td>
                <td className="whitespace-nowrap px-3 py-3.5">
                  <Badge tone={BUCKET_TONE[bucket]} dot>
                    {daysLabel(row)}
                  </Badge>
                </td>
                <td className="tnum px-3 py-3.5 text-end text-body-soft">
                  {fmtQty(row.quantity)} {unitShort(row.unit)}
                </td>
                <td className="tnum px-3 py-3.5 text-end font-medium text-body">
                  {fmtMoney(row.value_at_risk)}
                </td>
                <td className="px-5 py-3.5 text-end">
                  <Button
                    variant="ghost"
                    onClick={() => onWriteOff(row)}
                    aria-label={`${t("reports.expiry.writeOff")} — ${row.product_name}`}
                  >
                    <Trash2 className="h-4 w-4" />
                    <span className="hidden lg:inline">{t("reports.expiry.writeOff")}</span>
                  </Button>
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
