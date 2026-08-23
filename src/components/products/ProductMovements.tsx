import { History } from "lucide-react";
import { Card } from "../ui/Card";
import { EmptyState } from "../ui/EmptyState";
import type { StockMovement } from "../../lib/types";
import { fmtDateTime, signedQty } from "../../lib/format";
import { movementLabel } from "../../lib/constants";
import { t } from "../../i18n";

interface ProductMovementsProps {
  movements: StockMovement[];
}

export function ProductMovements({ movements }: ProductMovementsProps) {
  return (
    <Card title={t("productDetail.history")} bodyClassName="px-0 pb-2 pt-1">
      {movements.length === 0 ? (
        <EmptyState compact icon={History} title={t("productDetail.emptyHistory")} body="" />
      ) : (
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
      )}
    </Card>
  );
}
