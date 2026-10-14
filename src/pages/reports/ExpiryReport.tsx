import { useCallback, useEffect, useState } from "react";
import { CalendarClock } from "lucide-react";
import { useAuth } from "../../contexts/AuthContext";
import { useToast } from "../../contexts/ToastContext";
import { Button } from "../../components/ui/Button";
import { Card } from "../../components/ui/Card";
import { EmptyState } from "../../components/ui/EmptyState";
import { Stat } from "../../components/ui/Stat";
import { Tabs } from "../../components/ui/Tabs";
import { ConfirmDialog } from "../../components/ui/ConfirmDialog";
import { ExpiryTable } from "../../components/reports/ExpiryTable";
import { callAdjustStock } from "../../lib/api";
import { fetchExpiryReport, expiryBucket } from "../../lib/lots";
import { newOperationId } from "../../lib/ids";
import { submitOrQueue } from "../../lib/offline/submit";
import { fmtMoney, fmtQty } from "../../lib/format";
import { downloadCsv, todayIso } from "../../lib/csv";
import type { ExpiryRow } from "../../lib/types";
import { t } from "../../i18n";

type WindowKey = "d7" | "d30" | "all";

export default function ExpiryReport() {
  const { store } = useAuth();
  const { showToast } = useToast();
  const [window, setWindow] = useState<WindowKey>("d30");
  const [rows, setRows] = useState<ExpiryRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [writingOff, setWritingOff] = useState<ExpiryRow | null>(null);
  const [busy, setBusy] = useState(false);

  const load = useCallback(async () => {
    if (!store) return;
    setLoading(true);
    try {
      const withinDays = window === "all" ? undefined : window === "d7" ? 7 : 30;
      setRows(await fetchExpiryReport(store.id, withinDays));
    } catch (err) {
      showToast(err instanceof Error ? err.message : t("common.error"), "error");
      setRows([]);
    } finally {
      setLoading(false);
    }
  }, [store, window, showToast]);

  useEffect(() => {
    load();
  }, [load]);

  /**
   * A write-off is a `damage` movement against the specific lot, not a delete.
   * History is immutable, so the dialog says that plainly rather than offering an
   * undo it cannot honour.
   */
  const confirmWriteOff = async () => {
    if (!writingOff) return;
    setBusy(true);
    try {
      const opId = newOperationId();
      const input = {
        productId: writingOff.product_id,
        movementType: "damage" as const,
        quantity: Number(writingOff.quantity),
        lotId: writingOff.lot_id,
        reason: "expired",
        note: writingOff.lot_code ? `Lot ${writingOff.lot_code}` : null,
        clientOpId: opId,
      };
      const outcome = await submitOrQueue("adjust_stock", opId, input, () =>
        callAdjustStock(input)
      );
      showToast(
        outcome === "queued" ? t("toast.queuedOffline") : t("reports.expiry.writeOffDone")
      );
      setWritingOff(null);
      await load();
    } catch (err) {
      showToast(err instanceof Error ? err.message : t("common.error"), "error");
    } finally {
      setBusy(false);
    }
  };

  const totalAtRisk = rows.reduce((sum, r) => sum + Number(r.value_at_risk), 0);
  const countIn = (bucket: ReturnType<typeof expiryBucket>) =>
    rows.filter((r) => expiryBucket(r.days_left) === bucket).length;

  const handleExport = () => {
    downloadCsv(
      `expiration-${todayIso()}.csv`,
      [
        t("csv.header.product"),
        t("reports.expiry.lot"),
        t("csv.header.expiryDate"),
        t("csv.header.daysLeft"),
        t("reports.expiry.qty"),
        t("reports.expiry.valueAtRisk"),
      ],
      rows.map((r) => [
        r.product_name,
        r.lot_code ?? "",
        r.expiry_date,
        r.days_left,
        r.quantity,
        r.value_at_risk,
      ])
    );
  };

  return (
    <div className="space-y-4">
      {rows.length > 0 && (
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          <Stat
            label={t("reports.expiry.totalAtRisk")}
            value={fmtMoney(totalAtRisk)}
            tone={totalAtRisk > 0 ? "danger" : "neutral"}
          />
          <Stat
            label={t("reports.expiry.expiredCount")}
            value={String(countIn("expired"))}
            tone={countIn("expired") > 0 ? "danger" : "neutral"}
          />
          <Stat
            label={t("reports.expiry.criticalCount")}
            value={String(countIn("critical"))}
            tone={countIn("critical") > 0 ? "warning" : "neutral"}
          />
          <Stat label={t("reports.expiry.soonCount")} value={String(countIn("soon"))} />
        </div>
      )}

      <div className="flex flex-wrap items-center justify-between gap-3">
        <Tabs<WindowKey>
          tabs={[
            { key: "d7", label: t("reports.expiry.window7") },
            { key: "d30", label: t("reports.expiry.soon30") },
            { key: "all", label: t("reports.expiry.all") },
          ]}
          active={window}
          onChange={setWindow}
        />
        <Button variant="secondary" onClick={handleExport} disabled={rows.length === 0}>
          {t("common.exportCsv")}
        </Button>
      </div>

      <Card bodyClassName={loading ? "" : "px-0 pb-0"}>
        {loading ? (
          <div className="space-y-3 p-5">
            {Array.from({ length: 5 }).map((_, i) => (
              <div key={i} className="h-10 animate-pulse rounded-lg bg-surface-high" />
            ))}
          </div>
        ) : rows.length === 0 ? (
          <EmptyState icon={CalendarClock} title={t("reports.expiry.empty")} body="" />
        ) : (
          <ExpiryTable rows={rows} onWriteOff={setWritingOff} />
        )}
      </Card>

      <ConfirmDialog
        open={!!writingOff}
        title={t("reports.expiry.writeOffTitle")}
        body={
          writingOff
            ? t("reports.expiry.writeOffBody", {
                qty: fmtQty(writingOff.quantity),
                name: writingOff.product_name,
                lot: writingOff.lot_code ?? "—",
              })
            : ""
        }
        confirmLabel={t("reports.expiry.writeOff")}
        loading={busy}
        onConfirm={confirmWriteOff}
        onCancel={() => setWritingOff(null)}
      />
    </div>
  );
}
