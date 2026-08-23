import { History } from "lucide-react";
import { Card } from "../ui/Card";
import { EmptyState } from "../ui/EmptyState";
import { Badge } from "../ui/Badge";
import type { CarnetTransaction } from "../../lib/types";
import { fmtDateTime, signedAmount } from "../../lib/format";
import { transactionLabel } from "../../lib/constants";
import { t } from "../../i18n";

interface TransactionHistoryProps {
  transactions: CarnetTransaction[];
}

export function TransactionHistory({ transactions }: TransactionHistoryProps) {
  return (
    <Card title={t("customerDetail.history")} bodyClassName="px-0 pb-2 pt-1">
      {transactions.length === 0 ? (
        <EmptyState compact icon={History} title={t("customerDetail.emptyHistory")} body="" />
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-neutral-200 bg-neutral-50 text-xs font-semibold uppercase tracking-wide text-neutral-500">
                <th className="px-5 py-3 text-start">{t("common.date")}</th>
                <th className="px-3 py-3 text-start">{t("customerDetail.tx.type")}</th>
                <th className="px-3 py-3 text-start">{t("customerDetail.tx.amount")}</th>
                <th className="px-5 py-3 text-start hidden md:table-cell">{t("customerDetail.tx.note")}</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-neutral-100">
              {transactions.map((tx) => (
                <tr key={tx.id} className="hover:bg-neutral-50/60">
                  <td className="whitespace-nowrap px-5 py-3.5 text-neutral-500">
                    {fmtDateTime(tx.created_at)}
                  </td>
                  <td className="px-3 py-3.5 font-medium text-neutral-800">
                    <Badge tone={Number(tx.amount) > 0 ? "danger" : "success"} dot>
                      {transactionLabel(tx.type)}
                    </Badge>
                  </td>
                  <td
                    className={`tnum whitespace-nowrap px-3 py-3.5 font-semibold ${
                      Number(tx.amount) > 0 ? "text-red-600" : "text-emerald-600"
                    }`}
                  >
                    {signedAmount(Number(tx.amount))}
                  </td>
                  <td className="hidden max-w-[18rem] truncate px-5 py-3.5 text-neutral-500 md:table-cell">
                    {tx.note ?? "—"}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </Card>
  );
}
