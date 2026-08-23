import { Link } from "react-router-dom";
import { ArrowDownLeft, ArrowUpRight } from "lucide-react";
import { EmptyState } from "../ui/EmptyState";
import type { StockMovementWithProduct } from "../../lib/types";
import { fmtDateTime, signedQty } from "../../lib/format";
import { movementLabel, unitShort } from "../../lib/constants";
import { t } from "../../i18n";

interface MovementFeedProps {
  movements: StockMovementWithProduct[];
}

export function MovementFeed({ movements }: MovementFeedProps) {
  if (movements.length === 0) {
    return <EmptyState compact icon={ArrowDownLeft} title={t("dash.empty.movements")} body="" />;
  }
  return (
    <ul className="divide-y divide-neutral-100">
      {movements.map((m) => {
        const isIn = Number(m.quantity) > 0;
        return (
          <li key={m.id} className="flex items-center gap-3 px-5 py-3">
            <span
              className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-full ${
                isIn ? "bg-emerald-50 text-emerald-600" : "bg-red-50 text-red-500"
              }`}
            >
              {isIn ? <ArrowDownLeft className="h-4 w-4" /> : <ArrowUpRight className="h-4 w-4" />}
            </span>
            <div className="min-w-0 flex-1">
              <Link
                to={`/products/${m.product_id}`}
                className="block truncate text-sm font-medium text-neutral-900 hover:text-primary-700"
              >
                {m.product?.name ?? "—"}
              </Link>
              <p className="text-xs text-neutral-500">
                {movementLabel(m.movement_type)} · {fmtDateTime(m.created_at)}
              </p>
            </div>
            <span
              className={`tnum whitespace-nowrap text-sm font-semibold ${
                isIn ? "text-emerald-600" : "text-red-600"
              }`}
            >
              {signedQty(Number(m.quantity))} {unitShort(m.product?.unit ?? "piece")}
            </span>
          </li>
        );
      })}
    </ul>
  );
}
