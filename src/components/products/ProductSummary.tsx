import { Badge, stockStatusTone } from "../ui/Badge";
import { Card } from "../ui/Card";
import type { Product } from "../../lib/types";
import { getStockStatus } from "../../lib/stockStatus";
import { fmtDate, fmtMoneyShort, fmtQty } from "../../lib/format";
import { unitShort } from "../../lib/constants";
import { t } from "../../i18n";

interface ProductSummaryProps {
  product: Product;
  categoryName: string | null;
}

export function ProductSummary({ product, categoryName }: ProductSummaryProps) {
  const stock = Number(product.current_stock);
  const status = getStockStatus(stock, product.low_stock_threshold);

  const statusLabel =
    status === "out"
      ? t("products.status.out")
      : status === "low"
        ? t("products.status.low")
        : t("products.status.healthy");

  return (
    <Card>
      <div className="flex flex-col items-start gap-2">
        <span className="text-sm font-medium text-neutral-500">
          {t("productDetail.currentStock")}
        </span>
        <p className="tnum text-4xl font-semibold tracking-tight text-neutral-900">
          {fmtQty(stock)}
          <span className="ms-1.5 text-base font-medium text-neutral-400">
            {unitShort(product.unit)}
          </span>
        </p>
        <Badge tone={stockStatusTone(status)} dot>
          {statusLabel}
        </Badge>
        <dl className="mt-4 w-full space-y-2 border-t border-neutral-100 pt-4 text-sm">
          <div className="flex justify-between gap-2">
            <dt className="text-neutral-500">{t("products.table.category")}</dt>
            <dd className="font-medium text-neutral-900">{categoryName ?? t("productDetail.none")}</dd>
          </div>
          <div className="flex justify-between gap-2">
            <dt className="text-neutral-500">{t("productDetail.costPrice")}</dt>
            <dd className="tnum font-medium text-neutral-900">{fmtMoneyShort(product.cost_price)}</dd>
          </div>
          <div className="flex justify-between gap-2">
            <dt className="text-neutral-500">{t("productDetail.sellPrice")}</dt>
            <dd className="tnum font-medium text-neutral-900">{fmtMoneyShort(product.sell_price)}</dd>
          </div>
          <div className="flex justify-between gap-2">
            <dt className="text-neutral-500">{t("productDetail.threshold")}</dt>
            <dd className="tnum font-medium text-neutral-900">
              {product.low_stock_threshold != null
                ? fmtQty(Number(product.low_stock_threshold))
                : "—"}
            </dd>
          </div>
          <div className="flex justify-between gap-2">
            <dt className="text-neutral-500">{t("productDetail.expiry")}</dt>
            <dd className="font-medium text-neutral-900">{fmtDate(product.expiry_date)}</dd>
          </div>
          <div className="flex justify-between gap-2">
            <dt className="text-neutral-500">{t("productDetail.barcode")}</dt>
            <dd className="tnum max-w-[10rem] truncate font-medium text-neutral-900">
              {product.barcode ?? "—"}
            </dd>
          </div>
        </dl>
      </div>
    </Card>
  );
}
