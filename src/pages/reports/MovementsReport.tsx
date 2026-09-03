import { useEffect, useMemo, useState } from "react";
import { CalendarRange } from "lucide-react";
import { supabase } from "../../lib/supabaseClient";
import { useAuth } from "../../contexts/AuthContext";
import { Card } from "../../components/ui/Card";
import { EmptyState } from "../../components/ui/EmptyState";
import { Input } from "../../components/ui/Input";
import { Button } from "../../components/ui/Button";
import { downloadCsv, endOfDayIso, firstDayOfMonthIso, startOfDayIso, todayIso } from "../../lib/csv";
import { fmtQty, signedQty } from "../../lib/format";
import { MOVEMENT_TYPES, movementLabel } from "../../lib/constants";
import type { StockMovement } from "../../lib/types";
import { t } from "../../i18n";

export default function MovementsReport() {
  const { store } = useAuth();
  const [fromDate, setFromDate] = useState(firstDayOfMonthIso());
  const [toDate, setToDate] = useState(todayIso());
  const [applied, setApplied] = useState<{ from: string; to: string } | null>(null);

  const [movements, setMovements] = useState<StockMovement[]>([]);
  const [loading, setLoading] = useState(false);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    if (!store || !applied) return;
    setLoading(true);
    supabase
      .from("stock_movements")
      .select("*")
      .eq("store_id", store.id)
      .gte("created_at", startOfDayIso(applied.from))
      .lte("created_at", endOfDayIso(applied.to))
      .order("created_at")
      .then(({ data }) => {
        setMovements((data ?? []) as StockMovement[]);
        setLoading(false);
        setLoaded(true);
      });
  }, [store, applied]);

  const summary = useMemo(() => {
    const map = new Map<string, { count: number; net: number }>();
    for (const m of movements) {
      const entry = map.get(m.movement_type) ?? { count: 0, net: 0 };
      entry.count += 1;
      entry.net += Number(m.quantity);
      map.set(m.movement_type, entry);
    }
    return MOVEMENT_TYPES.filter((mt) => map.has(mt.value)).map((mt) => ({
      ...mt,
      ...(map.get(mt.value) as { count: number; net: number }),
    }));
  }, [movements]);

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
            body={`${t("common.from")} ${fromDate} ${t("common.to").toLowerCase()} ${toDate}`}
            action={
              <Button onClick={() => setApplied({ from: fromDate, to: toDate })}>
                {t("common.apply")}
              </Button>
            }
          />
        ) : summary.length === 0 ? (
          <EmptyState icon={CalendarRange} title={t("reports.movements.empty")} body="" />
        ) : (
          <>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-neutral-200 bg-neutral-50 text-xs font-semibold uppercase tracking-wide text-neutral-500">
                    <th className="px-5 py-3 text-start">{t("reports.movements.type")}</th>
                    <th className="px-3 py-3 text-start">{t("reports.movements.count")}</th>
                    <th className="px-5 py-3 text-end">{t("reports.movements.netQty")}</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-neutral-100">
                  {summary.map((s) => (
                    <tr key={s.value} className="hover:bg-neutral-50/60">
                      <td className="px-5 py-3.5 font-medium text-neutral-900">{movementLabel(s.value)}</td>
                      <td className="tnum px-3 py-3.5 text-neutral-700">{s.count}</td>
                      <td
                        className={`tnum px-5 py-3.5 text-end font-semibold ${
                          s.net >= 0 ? "text-emerald-600" : "text-red-600"
                        }`}
                      >
                        {signedQty(s.net)}
                      </td>
                    </tr>
                  ))}
                </tbody>
                <tfoot>
                  <tr className="border-t-2 border-neutral-200 bg-neutral-50 font-semibold">
                    <td className="px-5 py-3.5 text-neutral-900">{t("reports.movements.total")}</td>
                    <td className="tnum px-3 py-3.5 text-neutral-900">
                      {fmtQty(movements.length)}
                    </td>
                    <td className="tnum px-5 py-3.5 text-end text-neutral-900">
                      {signedQty(movements.reduce((sum, m) => sum + Number(m.quantity), 0))}
                    </td>
                  </tr>
                </tfoot>
              </table>
            </div>
            <div className="px-5 pb-4 pt-1">
              <Button
                variant="secondary"
                onClick={() =>
                  downloadCsv(
                    `mouvements-${applied!.from}_${applied!.to}.csv`,
                    [
                      t("reports.movements.type"),
                      t("reports.movements.count"),
                      t("reports.movements.netQty"),
                    ],
                    summary.map((s) => [movementLabel(s.value), s.count, s.net])
                  )
                }
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
