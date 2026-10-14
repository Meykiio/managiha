import { ArrowDownLeft, ArrowUpRight } from "lucide-react";
import { EmptyState } from "../ui/EmptyState";
import type { CarnetTransactionWithCustomer } from "../../lib/types";
import { fmtDateTime, signedQty } from "../../lib/format";
import { transactionLabel } from "../../lib/constants";
import { t } from "../../i18n";

interface CarnetFeedProps {
  transactions: CarnetTransactionWithCustomer[];
}

export function CarnetFeed({ transactions }: CarnetFeedProps) {
  if (transactions.length === 0) {
    return <EmptyState compact icon={ArrowUpRight} title={t("dash.empty.carnet")} body="" />;
  }
  return (
    <ul className="divide-y divide-line">
      {transactions.map((tx) => {
        const isDebt = Number(tx.amount) > 0;
        return (
          <li key={tx.id} className="flex items-center gap-3 px-5 py-3">
            <span
              className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-full ${
                isDebt ? "bg-error-tint text-error-fg" : "bg-positive-tint text-positive-fg"
              }`}
            >
              {isDebt ? <ArrowUpRight className="h-4 w-4" /> : <ArrowDownLeft className="h-4 w-4" />}
            </span>
            <div className="min-w-0 flex-1">
              <p className="truncate text-sm font-medium text-body">
                {tx.customer?.full_name ?? "—"}
              </p>
              <p className="text-xs text-body-muted">
                {transactionLabel(tx.type)} · {fmtDateTime(tx.created_at)}
              </p>
            </div>
            <span
              className={`tnum whitespace-nowrap text-sm font-semibold ${
                isDebt ? "text-error-fg" : "text-positive-fg"
              }`}
            >
              {signedQty(Number(tx.amount))}
            </span>
          </li>
        );
      })}
    </ul>
  );
}
