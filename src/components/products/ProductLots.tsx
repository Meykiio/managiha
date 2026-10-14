import { useCallback, useEffect, useState } from "react";
import { CalendarClock, Layers } from "lucide-react";
import { Badge } from "../ui/Badge";
import { Card } from "../ui/Card";
import { EmptyState } from "../ui/EmptyState";
import { Skeleton } from "../ui/Spinner";
import { fetchProductLots } from "../../lib/lots";
import { fmtDate, fmtQty } from "../../lib/format";
import { unitShort } from "../../lib/constants";
import { expiryStatus } from "../../lib/expiry";
import { t } from "../../i18n";
import type { ProductLot, Unit } from "../../lib/types";

interface ProductLotsProps {
  productId: string;
  unit: Unit;
}

/**
 * The open lots for a product, in the order a sale will consume them.
 *
 * This is the visible half of FEFO. The server has allocated by earliest expiry
 * since migration 00016, but a shopkeeper could not see which delivery was next
 * until this existed, which made the ordering something they had to take on
 * trust. The first open lot is labelled as the next one to sell, and it is
 * labelled from the same ordering the server uses, not from a second
 * implementation here.
 *
 * Closed lots are shown too, greyed, because "this delivery is finished" is
 * information the shopkeeper needs when counting the shelf.
 */
export function ProductLots({ productId, unit }: ProductLotsProps) {
  const [lots, setLots] = useState<ProductLot[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      setLots(await fetchProductLots(productId));
    } catch (err) {
      setError(err instanceof Error ? err.message : t("common.error"));
    } finally {
      setLoading(false);
    }
  }, [productId]);

  useEffect(() => {
    load();
  }, [load]);

  const nextLotId = lots.find((l) => !l.closed_at && Number(l.quantity) > 0)?.id ?? null;
  const hasOpen = nextLotId !== null;

  if (loading) {
    return (
      <Card title={t("productDetail.lots.title")}>
        <div className="space-y-3">
          <Skeleton className="h-6 w-full" />
          <Skeleton className="h-6 w-full" />
        </div>
      </Card>
    );
  }

  return (
    <Card
      title={t("productDetail.lots.title")}
      bodyClassName={lots.length === 0 ? "" : "px-0 pb-2 pt-1"}
    >
      {error ? (
        <p className="text-sm text-error-fg">{error}</p>
      ) : lots.length === 0 ? (
        <EmptyState compact icon={Layers} title={t("productDetail.lots.empty")} body="" />
      ) : (
        <ul className="divide-y divide-line">
          {lots.map((lot) => {
            const closed = lot.closed_at !== null;
            const expiry = expiryStatus(lot.expiry_date);
            return (
              <li
                key={lot.id}
                className={`flex flex-wrap items-center gap-x-3 gap-y-1.5 px-5 py-3 ${
                  closed ? "opacity-50" : ""
                }`}
              >
                <CalendarClock
                  className="h-4 w-4 shrink-0 text-body-muted"
                  aria-hidden="true"
                />

                <span className="tnum min-w-[7rem] text-sm font-medium text-body">
                  {lot.expiry_date ? fmtDate(lot.expiry_date) : t("productDetail.lots.noExpiry")}
                </span>

                <span className="min-w-0 flex-1 truncate text-xs text-body-muted">
                  {lot.lot_code ?? t("productDetail.lots.unlabelled")}
                </span>

                {lot.id === nextLotId && (
                  <Badge tone="info" dot>
                    {t("productDetail.lots.next")}
                  </Badge>
                )}
                {!closed && lot.id !== nextLotId && expiry.tone && (
                  <Badge tone={expiry.tone} dot>
                    {expiry.tone === "danger"
                      ? t("reports.expiry.expired")
                      : t("reports.expiry.soon")}
                  </Badge>
                )}
                {closed && <Badge tone="neutral">{t("productDetail.lots.closed")}</Badge>}

                <span className="tnum text-end text-sm text-body-soft">
                  {fmtQty(Number(lot.quantity))} {unitShort(unit)}
                </span>
              </li>
            );
          })}
        </ul>
      )}

      {!error && lots.length > 0 && !hasOpen && (
        <p className="px-5 pb-3 text-xs text-body-muted">{t("productDetail.lots.allClosed")}</p>
      )}
    </Card>
  );
}
