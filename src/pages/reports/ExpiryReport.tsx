import { useEffect, useState } from "react";
import { CalendarClock } from "lucide-react";
import { supabase } from "../../lib/supabaseClient";
import { useAuth } from "../../contexts/AuthContext";
import { useToast } from "../../contexts/ToastContext";
import { Button } from "../../components/ui/Button";
import { Card } from "../../components/ui/Card";
import { EmptyState } from "../../components/ui/EmptyState";
import { Badge } from "../../components/ui/Badge";
import { Tabs } from "../../components/ui/Tabs";
import type { Product } from "../../lib/types";
import { fmtDate } from "../../lib/format";
import { downloadCsv, todayIso } from "../../lib/csv";
import { EXPIRY_SOON_DAYS, expiryStatus } from "../../lib/expiry";
import { t } from "../../i18n";

type WindowKey = "soon" | "all";

export default function ExpiryReport() {
  const { store } = useAuth();
  const { showToast } = useToast();
  const [window, setWindow] = useState<WindowKey>("soon");
  const [rows, setRows] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!store) return;
    let cancelled = false;
    setLoading(true);
    const cutoff = new Date();
    cutoff.setDate(cutoff.getDate() + EXPIRY_SOON_DAYS);
    let query = supabase
      .from("products")
      .select("*")
      .eq("store_id", store.id)
      .eq("active", true)
      .is("archived_at", null)
      .not("expiry_date", "is", null)
      .order("expiry_date");
    if (window === "soon") query = query.lte("expiry_date", cutoff.toISOString().slice(0, 10));
    query.limit(500).then(({ data, error }) => {
      if (cancelled) return;
      if (error) showToast(error.message, "error");
      setRows((data ?? []) as Product[]);
      setLoading(false);
    });
    return () => {
      cancelled = true;
    };
  }, [store, window, showToast]);

  const handleExport = () => {
    downloadCsv(
      `expiration-${todayIso()}.csv`,
      ["Produit", "Date d'expiration", "Jours restants"],
      rows.map((p) => {
        const { days } = expiryStatus(p.expiry_date);
        return [p.name, p.expiry_date ?? "", days ?? ""];
      })
    );
  };

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <Tabs<WindowKey>
          tabs={[
            { key: "soon", label: t("reports.expiry.soon30") },
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
              <div key={i} className="h-10 animate-pulse rounded-lg bg-neutral-100" />
            ))}
          </div>
        ) : rows.length === 0 ? (
          <EmptyState icon={CalendarClock} title={t("reports.expiry.empty")} body="" />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-neutral-200 bg-neutral-50 text-xs font-semibold uppercase tracking-wide text-neutral-500">
                  <th className="px-5 py-3 text-start">{t("reports.lowStock.product")}</th>
                  <th className="px-3 py-3 text-start">{t("reports.expiry.date")}</th>
                  <th className="px-3 py-3 text-start">{t("reports.expiry.daysLeft")}</th>
                  <th className="px-5 py-3 text-end">{t("common.status")}</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-neutral-100">
                {rows.map((p) => {
                  const { days, tone } = expiryStatus(p.expiry_date);
                  return (
                    <tr key={p.id} className="hover:bg-neutral-50/60">
                      <td className="max-w-[16rem] truncate px-5 py-3.5 font-medium text-neutral-900">
                        {p.name}
                      </td>
                      <td className="whitespace-nowrap px-3 py-3.5 text-neutral-600">
                        {fmtDate(p.expiry_date)}
                      </td>
                      <td className="tnum px-3 py-3.5 text-neutral-700">{days}</td>
                      <td className="px-5 py-3.5 text-end">
                        {tone && (
                          <Badge tone={tone} dot>
                            {tone === "danger" ? t("reports.expiry.expired") : t("reports.expiry.soon")}
                          </Badge>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </Card>
    </div>
  );
}