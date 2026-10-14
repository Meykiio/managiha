import { useEffect, useState } from "react";
import { Image } from "lucide-react";
import { Badge, stockStatusTone } from "../ui/Badge";
import { Card } from "../ui/Card";
import type { Product } from "../../lib/types";
import { getStockStatus } from "../../lib/stockStatus";
import { expiryStatus } from "../../lib/expiry";
import { computeMargin } from "../../lib/margin";
import { cn } from "../../lib/utils";
import { fmtDate, fmtMoneyShort, fmtQty } from "../../lib/format";
import { unitShort } from "../../lib/constants";
import { t } from "../../i18n";
import { getProductImageUrl } from "../../lib/productImages";
import { useAuth } from "../../contexts/AuthContext";

interface ProductSummaryProps {
  product: Product;
  categoryName: string | null;
}

export function ProductSummary({ product, categoryName }: ProductSummaryProps) {
  const { store } = useAuth();
  const stock = Number(product.current_stock);
  const status = getStockStatus(stock, product.low_stock_threshold);
  const expiry = expiryStatus(product.expiry_date);
  const margin = computeMargin(product.sell_price, product.cost_price);
  const [imageUrl, setImageUrl] = useState<string | null>(null);

  useEffect(() => {
    if (!store || !product.image_path) {
      setImageUrl(null);
      return;
    }
    let cancelled = false;
    getProductImageUrl(store.id, product.id)
      .then((url) => { if (!cancelled) setImageUrl(url); })
      .catch(() => { if (!cancelled) setImageUrl(null); });
    return () => { cancelled = true; };
  }, [store, product.id, product.image_path]);

  const statusLabel =
    status === "out"
      ? t("products.status.out")
      : status === "low"
        ? t("products.status.low")
        : t("products.status.healthy");

  return (
    <Card>
      <div className="flex flex-col items-start gap-2">
        {imageUrl ? (
          <img
            src={imageUrl}
            alt={product.name}
            className="mb-2 h-40 w-full rounded-lg object-cover"
          />
        ) : (
          <div className="mb-2 flex h-40 w-full items-center justify-center rounded-lg bg-surface-high text-body-muted">
            <Image className="h-10 w-10" />
          </div>
        )}
        <span className="text-sm font-medium text-body-muted">
          {t("productDetail.currentStock")}
        </span>
        <p className="tnum text-4xl font-semibold tracking-tight text-body">
          {fmtQty(stock)}
          <span className="ms-1.5 text-base font-medium text-body-muted">
            {unitShort(product.unit)}
          </span>
        </p>
        <div className="flex flex-wrap gap-2">
          <Badge tone={stockStatusTone(status)} dot>
            {statusLabel}
          </Badge>
          {expiry.tone && (
            <Badge tone={expiry.tone} dot>
              {expiry.tone === "danger" ? t("reports.expiry.expired") : t("reports.expiry.soon")}
            </Badge>
          )}
        </div>
        <dl className="mt-4 w-full space-y-2 border-t border-line pt-4 text-sm">
          <div className="flex justify-between gap-2">
            <dt className="text-body-muted">{t("products.table.category")}</dt>
            <dd className="font-medium text-body">{categoryName ?? t("productDetail.none")}</dd>
          </div>
          <div className="flex justify-between gap-2">
            <dt className="text-body-muted">{t("productDetail.costPrice")}</dt>
            <dd className="tnum font-medium text-body">{fmtMoneyShort(product.cost_price)}</dd>
          </div>
          <div className="flex justify-between gap-2">
            <dt className="text-body-muted">{t("productDetail.sellPrice")}</dt>
            <dd className="tnum font-medium text-body">{fmtMoneyShort(product.sell_price)}</dd>
          </div>
          <div className="flex justify-between gap-2">
            <dt className="text-body-muted">{t("productDetail.margin")}</dt>
            <dd className="text-end">
              {margin.absolute == null ? (
                <span className="text-body-muted">{t("productDetail.marginUnknown")}</span>
              ) : (
                <span className="flex items-center justify-end gap-2">
                  <span className={cn("tnum font-medium", margin.belowCost ? "text-error-fg" : "text-positive-fg")}>
                    {fmtMoneyShort(margin.absolute)}
                  </span>
                  <span className="tnum text-xs text-body-muted">
                    {margin.percent != null
                      ? t("productDetail.marginPercent", { percent: margin.percent.toFixed(0) })
                      : ""}
                  </span>
                  {margin.belowCost && (
                    <Badge tone="danger" dot>
                      {t("productDetail.belowCost")}
                    </Badge>
                  )}
                </span>
              )}
            </dd>
          </div>
          <div className="flex justify-between gap-2">
            <dt className="text-body-muted">{t("productDetail.threshold")}</dt>
            <dd className="tnum font-medium text-body">
              {product.low_stock_threshold != null
                ? fmtQty(Number(product.low_stock_threshold))
                : "—"}
            </dd>
          </div>
          <div className="flex justify-between gap-2">
            <dt className="text-body-muted">{t("productDetail.expiry")}</dt>
            <dd className="font-medium text-body">{fmtDate(product.expiry_date)}</dd>
          </div>
          <div className="flex justify-between gap-2">
            <dt className="text-body-muted">{t("productDetail.barcode")}</dt>
            <dd className="tnum max-w-[10rem] truncate font-medium text-body">
              {product.barcode ?? "—"}
            </dd>
          </div>
        </dl>
      </div>
    </Card>
  );
}
