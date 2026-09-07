import { useCallback, useEffect, useState } from "react";
import { History } from "lucide-react";
import { supabase } from "../../lib/supabaseClient";
import { useToast } from "../../contexts/ToastContext";
import { Card } from "../ui/Card";
import { EmptyState } from "../ui/EmptyState";
import { Badge } from "../ui/Badge";
import { Pagination } from "../ui/Pagination";
import { Skeleton } from "../ui/Spinner";
import type { CarnetTransaction } from "../../lib/types";
import { fmtDateTime, signedAmount } from "../../lib/format";
import { PAGE_SIZE, transactionLabel } from "../../lib/constants";
import { t } from "../../i18n";

interface TransactionHistoryProps {
  customerId: string;
  reloadKey?: number;
}

export function TransactionHistory({ customerId, reloadKey = 0 }: TransactionHistoryProps) {
  const { showToast } = useToast();
  const [transactions, setTransactions] = useState<CarnetTransaction[]>([]);
  const [count, setCount] = useState(0);
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setPage(1);
  }, [customerId]);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const from = (page - 1) * PAGE_SIZE;
      const { data, error, count: total } = await supabase
        .from("carnet_transactions")
        .select("*", { count: "exact" })
        .eq("customer_id", customerId)
        .order("created_at", { ascending: false })
        .range(from, from + PAGE_SIZE - 1);
      if (error) throw new Error(error.message);
      setTransactions((data ?? []) as CarnetTransaction[]);
      setCount(total ?? 0);
    } catch (err) {
      showToast(err instanceof Error ? err.message : t("common.error"), "error");
      setTransactions([]);
    } finally {
      setLoading(false);
    }
  }, [customerId, page, showToast]);

  useEffect(() => {
    load();
  }, [load, reloadKey]);

  return (
    <Card title={t("customerDetail.history")} bodyClassName="px-0 pb-2 pt-1">
      {loading ? (
        <div className="space-y-2.5 px-5 py-3">
          {Array.from({ length: 5 }).map((_, i) => (
            <Skeleton key={i} className="h-10 w-full" />
          ))}
        </div>
      ) : transactions.length === 0 ? (
        <EmptyState compact icon={History} title={t("customerDetail.emptyHistory")} body="" />
      ) : (
        <>
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
          <div className="px-5 pb-2 pt-1">
            <Pagination page={page} totalPages={Math.max(1, Math.ceil(count / PAGE_SIZE))} onChange={setPage} />
          </div>
        </>
      )}
    </Card>
  );
}