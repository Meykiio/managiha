import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { Download, Wallet } from "lucide-react";
import { supabase } from "../../lib/supabaseClient";
import { useAuth } from "../../contexts/AuthContext";
import { Button } from "../../components/ui/Button";
import { Card } from "../../components/ui/Card";
import { EmptyState } from "../../components/ui/EmptyState";
import { downloadCsv } from "../../lib/csv";
import type { CarnetCustomer } from "../../lib/types";
import { fmtDate, fmtMoney, fmtMoneyShort } from "../../lib/format";
import { t } from "../../i18n";

export default function CarnetOutstandingReport() {
  const { store } = useAuth();
  const [rows, setRows] = useState<CarnetCustomer[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!store) return;
    let cancelled = false;
    setLoading(true);
    setError(null);
    (async () => {
      try {
        const { data, error: err } = await supabase
          .from("carnet_customers")
          .select("*")
          .eq("store_id", store.id)
          .is("archived_at", null)
          .gt("balance", 0)
          .order("balance", { ascending: false })
          .limit(2000);
        if (cancelled) return;
        if (err) {
          setError(err.message);
          setRows([]);
        } else {
          setRows((data ?? []) as CarnetCustomer[]);
        }
      } catch (err) {
        if (cancelled) return;
        setError(err instanceof Error ? err.message : t("common.error"));
        setRows([]);
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => { cancelled = true; };
  }, [store]);

  const total = rows.reduce((sum, c) => sum + Number(c.balance), 0);

  const handleExport = () => {
    downloadCsv(
      `carnet-impayes-${new Date().toISOString().slice(0, 10)}.csv`,
      [
        t("csv.header.customer"),
        t("csv.header.phone"),
        t("csv.header.balance"),
        t("csv.header.lastActivity"),
      ],
      rows.map((c) => [c.full_name, c.phone ?? "", Number(c.balance), fmtDate(c.updated_at)])
    );
  };

  if (loading) {
    return (
      <div className="space-y-3 p-5">
        {Array.from({ length: 5 }).map((_, i) => (
          <div key={i} className="h-10 animate-pulse rounded-lg bg-surface-high" />
        ))}
      </div>
    );
  }

  if (error) {
    return (
      <div className="rounded-lg bg-error-tint px-4 py-3 text-sm text-error-fg">
        {error}
      </div>
    );
  }

  return (
    <Card
      title={`${t("reports.carnetOutstanding.total")} : ${fmtMoneyShort(total)}`}
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
        <EmptyState icon={Wallet} title={t("reports.carnetOutstanding.empty")} body="" />
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-line bg-bg text-xs font-semibold uppercase tracking-wide text-body-muted">
                <th className="px-5 py-3 text-start">{t("reports.carnetOutstanding.customer")}</th>
                <th className="px-3 py-3 text-start hidden sm:table-cell">{t("reports.carnetOutstanding.phone")}</th>
                <th className="px-3 py-3 text-start hidden md:table-cell">{t("reports.carnetOutstanding.lastActivity")}</th>
                <th className="px-5 py-3 text-end">{t("reports.carnetOutstanding.balance")}</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-line">
              {rows.map((c) => (
                <tr key={c.id} className="hover:bg-surface-mid/60">
                  <td className="max-w-[16rem] truncate px-5 py-3.5 font-medium text-body">
                    {/* Reach the customer from the list of who owes money, which is
                        the whole reason for opening this report. */}
                    <Link
                      to={`/carnet/${c.id}`}
                      className="-my-2 inline-block py-2 hover:text-primary hover:underline"
                    >
                      {c.full_name}
                    </Link>
                  </td>
                  <td className="tnum px-3 py-3.5 text-body-muted hidden sm:table-cell">
                    {c.phone ?? "—"}
                  </td>
                  <td className="px-3 py-3.5 text-body-muted hidden md:table-cell">
                    {fmtDate(c.updated_at)}
                  </td>
                  <td className="tnum whitespace-nowrap px-5 py-3.5 text-end font-semibold text-error-fg">
                    {fmtMoney(c.balance)}
                  </td>
                </tr>
              ))}
            </tbody>
            <tfoot>
              <tr className="border-t-2 border-line bg-bg font-semibold text-body">
                <td className="px-5 py-3.5" colSpan={3}>
                  {t("reports.carnetOutstanding.total")}
                </td>
                <td className="tnum whitespace-nowrap px-5 py-3.5 text-end">
                  {fmtMoney(total)}
                </td>
              </tr>
            </tfoot>
          </table>
        </div>
      )}
    </Card>
  );
}
