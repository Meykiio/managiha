import { useCallback, useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { ClipboardCopy, MessageCircle, PackageSearch } from "lucide-react";
import { useAuth } from "../../contexts/AuthContext";
import { useToast } from "../../contexts/ToastContext";
import { Button } from "../../components/ui/Button";
import { Card } from "../../components/ui/Card";
import { EmptyState } from "../../components/ui/EmptyState";
import { Badge } from "../../components/ui/Badge";
import { Tabs } from "../../components/ui/Tabs";
import { fetchReorderList } from "../../lib/insights";
import { fmtQty } from "../../lib/format";
import { unitShort } from "../../lib/constants";
import { waLink } from "../../lib/format";
import { downloadCsv, todayIso } from "../../lib/csv";
import type { ReorderRow } from "../../lib/types";
import { t } from "../../i18n";

type Lookback = "d7" | "d30" | "d90";
const LOOKBACK_DAYS: Record<Lookback, number> = { d7: 7, d30: 30, d90: 90 };

interface SupplierGroup {
  key: string;
  name: string;
  phone: string | null;
  whatsapp: string | null;
  rows: ReorderRow[];
}

/**
 * What to buy, grouped by who to buy it from.
 *
 * The grouping is the point. A flat list of low-stock products is already the
 * low-stock report; what was missing is the list you can actually act on, which
 * has one section per wholesaler and a message you can send them. Ordering here
 * happens on the phone, so the share button writes the list rather than linking
 * to a blank chat.
 *
 * Products with no supplier are grouped first and cannot be shared. That is
 * deliberate: they are the ones needing a decision, not a purchase order.
 */
export default function ReorderReport() {
  const { store } = useAuth();
  const { showToast } = useToast();
  const [lookback, setLookback] = useState<Lookback>("d30");
  const [rows, setRows] = useState<ReorderRow[]>([]);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      setRows(await fetchReorderList(LOOKBACK_DAYS[lookback]));
    } catch (err) {
      showToast(err instanceof Error ? err.message : t("common.error"), "error");
      setRows([]);
    } finally {
      setLoading(false);
    }
  }, [lookback, showToast]);

  useEffect(() => {
    load();
  }, [load]);

  const groups = useMemo<SupplierGroup[]>(() => {
    const byKey = new Map<string, SupplierGroup>();
    for (const row of rows) {
      const key = row.supplier_id ?? "__none__";
      if (!byKey.has(key)) {
        byKey.set(key, {
          key,
          name: row.supplier_name ?? t("reports.reorder.noSupplier"),
          phone: row.supplier_phone,
          whatsapp: row.supplier_whatsapp ?? row.supplier_phone,
          rows: [],
        });
      }
      byKey.get(key)!.rows.push(row);
    }
    return [...byKey.values()];
  }, [rows]);

  const orderMessage = useCallback(
    (group: SupplierGroup) => {
      const lines = group.rows.map(
        (r) => `• ${fmtQty(r.suggested_qty)} × ${r.product_name}`
      );
      return [
        t("reports.reorder.messageHeader", { store: store?.name ?? "" }),
        ...lines,
      ].join("\n");
    },
    [store]
  );

  const copyGroup = async (group: SupplierGroup) => {
    try {
      await navigator.clipboard.writeText(orderMessage(group));
      showToast(t("reports.reorder.copied"));
    } catch {
      showToast(t("common.error"), "error");
    }
  };

  const exportAll = () => {
    downloadCsv(
      `reassort-${todayIso()}.csv`,
      [
        t("reports.reorder.supplier"),
        t("csv.header.product"),
        t("reports.sales.inStock"),
        t("reports.reorder.unitsSold"),
        t("reports.reorder.suggested"),
      ],
      rows.map((r) => [
        r.supplier_name ?? "",
        r.product_name,
        r.current_stock,
        r.units_sold,
        r.suggested_qty,
      ])
    );
  };

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <Tabs<Lookback>
          tabs={[
            { key: "d7", label: t("reports.sales.period7") },
            { key: "d30", label: t("reports.sales.period30") },
            { key: "d90", label: t("reports.sales.period90") },
          ]}
          active={lookback}
          onChange={setLookback}
        />
        <Button variant="secondary" onClick={exportAll} disabled={rows.length === 0}>
          {t("common.exportCsv")}
        </Button>
      </div>

      <p className="text-xs text-body-muted">
        {t("reports.reorder.hint", { days: LOOKBACK_DAYS[lookback] })}
      </p>

      {loading ? (
        <div className="space-y-3">
          {Array.from({ length: 3 }).map((_, i) => (
            <div key={i} className="h-24 animate-pulse rounded-xl bg-surface-high" />
          ))}
        </div>
      ) : rows.length === 0 ? (
        <Card>
          <EmptyState
            icon={PackageSearch}
            title={t("reports.reorder.empty")}
            body={t("reports.reorder.emptyBody")}
          />
        </Card>
      ) : (
        <div className="space-y-4">
          {groups.map((group) => {
            const wa = group.whatsapp ? waLink(group.whatsapp, orderMessage(group)) : null;
            return (
              <Card
                key={group.key}
                title={group.name}
                action={
                  <span className="flex items-center gap-2">
                    <Button variant="ghost" onClick={() => copyGroup(group)}>
                      <ClipboardCopy className="h-4 w-4" />
                      <span className="sr-only sm:not-sr-only">{t("reports.reorder.copy")}</span>
                    </Button>
                    {wa && (
                      <a
                        href={wa}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex h-11 items-center gap-2 rounded-lg bg-positive/10 px-3 text-sm font-medium text-positive-fg hover:bg-positive/20"
                      >
                        <MessageCircle className="h-4 w-4" aria-hidden="true" />
                        {t("reports.reorder.share")}
                      </a>
                    )}
                  </span>
                }
                bodyClassName="px-0 pb-0"
              >
                <ul className="divide-y divide-line">
                  {group.rows.map((r) => (
                    <li
                      key={r.product_id}
                      className="flex flex-wrap items-center justify-between gap-x-3 gap-y-1 px-5 py-2.5"
                    >
                      <span className="min-w-0 flex-1 truncate text-sm text-body">
                        <Link
                          to={`/products/${r.product_id}`}
                          className="hover:text-primary hover:underline"
                        >
                          {r.product_name}
                        </Link>
                      </span>
                      <span className="flex shrink-0 items-center gap-3 text-xs text-body-muted">
                        <span className="tnum">
                          {t("reports.sales.inStock")} {fmtQty(r.current_stock)}
                        </span>
                        {r.units_sold > 0 && (
                          <span className="tnum">
                            {t("reports.reorder.unitsSoldShort", { count: fmtQty(r.units_sold) })}
                          </span>
                        )}
                        <Badge tone="info">
                          {fmtQty(r.suggested_qty)} {unitShort(r.unit)}
                        </Badge>
                      </span>
                    </li>
                  ))}
                </ul>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}
