import { useEffect, useMemo, useState } from "react";
import { CalendarRange } from "lucide-react";
import { supabase } from "../../lib/supabaseClient";
import { useAuth } from "../../contexts/AuthContext";
import { useToast } from "../../contexts/ToastContext";
import { Card } from "../../components/ui/Card";
import { EmptyState } from "../../components/ui/EmptyState";
import { Input } from "../../components/ui/Input";
import { Button } from "../../components/ui/Button";
import { downloadCsv, endOfDayIso, firstDayOfMonthIso, startOfDayIso, todayIso } from "../../lib/csv";
import { fmtQty, signedQty } from "../../lib/format";
import { MOVEMENT_TYPES } from "../../lib/constants";
import { t } from "../../i18n";

interface SummaryRow {
  movement_type: string;
  movement_count: number;
  net_qty: number;
}

export default function MovementsReport() {
  const { store } = useAuth();
  const { showToast } = useToast();
  const [fromDate, setFromDate] = useState(firstDayOfMonthIso());
  const [toDate, setToDate] = useState(todayIso());
  const [applied, setApplied] = useState<{ from: string; to: string } | null>(null);
  const [rows, setRows] = useState<SummaryRow[]>([]);
  const [loading, setLoading] = useState(false);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    if (!store || !applied) return;
    let cancelled = false;
    setLoading(true);
    supabase
      .rpc("get_movements_summary", {
        p_from: startOfDayIso(applied.from),
        p_to: endOfDayIso(applied.to),
      })
      .then(({ data, error }) => {
        if (cancelled) return;
        if (error) showToast(error.message, "error");
        setRows(((data ?? []) as SummaryRow[]).slice());
        setLoading(false);
        setLoaded(true);
      });
    return () => {
      cancelled = true;
    };
  }, [store, applied, showToast]);

  const summary = useMemo(
    () =>
      MOVEMENT_TYPES.filter((mt) => rows.some((r) => r.movement_type === mt.value)).map((mt) => {
        const row = rows.find((r) => r.movement_type === mt.value);
        return { ...mt, count: Number(row?.movement_count ?? 0), net: Number(row?.net_qty ?? 0) };
      }),
    [rows]
  );

  const handleExport = () => {
    downloadCsv(
      `mouvements-${applied!.from}_${applied!.to}.csv`,
      [t("csv.header.type"), t("csv.header.count"), t("csv.header.netQuantity")],
      summary.map((s) => [t(s.labelKey), s.count, s.net])
    );
  };

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-end gap-3">
        <Input
          label={t("common.from")}
          type="date"
          value={fromDate}
          onChange={(e) => setFromDate(e.target.value)}
          className="max-w-48"
        />
        <Input
          label={t("common.to")}
          type="date"
          value={toDate}
          onChange={(e) => setToDate(e.target.value)}
          className="max-w-48"
        />
        <Button
          variant="secondary"
          onClick={() => setApplied({ from: fromDate, to: toDate })}
          loading={loading}
          className="mb-0.5"
        >
          <CalendarRange className="h-4 w-4" />
          {t("common.apply")}
        </Button>
      </div>

      <Card bodyClassName="px-0 pb-0">
        {!loaded && !loading ? (
          <EmptyState
            icon={CalendarRange}
            title={t("reports.movements.period")}
            body=""
            action={
              <Button onClick={() => setApplied({ from: fromDate, to: toDate })}>
                {t("common.apply")}
              </Button>
            }
          />
        ) : summary.length === 0 && !loading ? (
          <EmptyState icon={CalendarRange} title={t("reports.movements.empty")} body="" />
        ) : (
          <>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-line bg-bg text-xs font-semibold uppercase tracking-wide text-body-muted">
                    <th className="px-5 py-3 text-start">{t("reports.movements.type")}</th>
                    <th className="px-3 py-3 text-start">{t("reports.movements.count")}</th>
                    <th className="px-5 py-3 text-end">{t("reports.movements.netQty")}</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-line">
                  {summary.map((s) => (
                    <tr key={s.value} className="hover:bg-surface-mid/60">
                      <td className="px-5 py-3.5 font-medium text-body">{t(s.labelKey)}</td>
                      <td className="tnum px-3 py-3.5 text-body-soft">{fmtQty(s.count)}</td>
                      <td
                        className={`tnum px-5 py-3.5 text-end font-semibold ${
                          s.net >= 0 ? "text-positive-fg" : "text-error-fg"
                        }`}
                      >
                        {signedQty(s.net)}
                      </td>
                    </tr>
                  ))}
                </tbody>
                <tfoot>
                  <tr className="border-t-2 border-line bg-bg font-semibold">
                    <td className="px-5 py-3.5 text-body">{t("reports.movements.total")}</td>
                    <td className="tnum px-3 py-3.5 text-body">
                      {fmtQty(summary.reduce((sum, s) => sum + s.count, 0))}
                    </td>
                    <td className="tnum px-5 py-3.5 text-end text-body">
                      {signedQty(summary.reduce((sum, s) => sum + s.net, 0))}
                    </td>
                  </tr>
                </tfoot>
              </table>
            </div>
            <div className="px-5 pb-4 pt-1">
              <Button
                variant="secondary"
                onClick={handleExport}
                disabled={summary.length === 0}
              >
                {t("common.exportCsv")}
              </Button>
            </div>
          </>
        )}
      </Card>
    </div>
  );
}