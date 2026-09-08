import { Package, Plus, Search } from "lucide-react";
import type { Product } from "../../lib/types";
import { fmtMoney } from "../../lib/format";
import { t } from "../../i18n";

interface ScanResultProps {
  product: Product | null;
  barcode: string;
  onAddToCart: (product: Product) => void;
  onCreateNew: (barcode: string) => void;
  onDismiss: () => void;
}

export function ScanResult({
  product,
  barcode,
  onAddToCart,
  onCreateNew,
  onDismiss,
}: ScanResultProps) {
  if (!product) {
    return (
      <div className="rounded-xl border border-amber-200 bg-amber-50 p-4">
        <div className="flex items-start gap-3">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-amber-100">
            <Search size={20} className="text-amber-600" />
          </div>
          <div className="flex-1">
            <p className="text-sm font-medium text-amber-800">
              {t("scanner.product.notFound")}
            </p>
            <p className="mt-0.5 text-xs text-amber-600">
              {t("scanner.product.barcode")}: {barcode}
            </p>
            <div className="mt-3 flex gap-2">
              <button
                type="button"
                onClick={() => onCreateNew(barcode)}
                className="inline-flex items-center gap-1.5 rounded-lg bg-blue-600 px-3 py-1.5 text-xs font-medium text-white hover:bg-blue-700"
              >
                <Plus size={14} />
                {t("scanner.product.create")}
              </button>
              <button
                type="button"
                onClick={onDismiss}
                className="rounded-lg border border-amber-300 px-3 py-1.5 text-xs font-medium text-amber-700 hover:bg-amber-100"
              >
                {t("common.cancel")}
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="rounded-xl border border-green-200 bg-green-50 p-4">
      <div className="flex items-start gap-3">
        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-green-100">
          <Package size={20} className="text-green-600" />
        </div>
        <div className="flex-1">
          <p className="text-sm font-medium text-green-800">
            {product.name}
          </p>
          <div className="mt-1 flex flex-wrap gap-x-3 gap-y-1 text-xs text-green-700">
            <span>
              {t("scanner.product.price")}: {fmtMoney(product.sell_price)}
            </span>
            <span>
              {t("scanner.product.stock")}: {product.current_stock}
            </span>
          </div>
          <div className="mt-3 flex gap-2">
            <button
              type="button"
              onClick={() => onAddToCart(product)}
              className="inline-flex items-center gap-1.5 rounded-lg bg-green-600 px-3 py-1.5 text-xs font-medium text-white hover:bg-green-700"
            >
              <Plus size={14} />
              {t("scanner.product.addToCart")}
            </button>
            <button
              type="button"
              onClick={onDismiss}
              className="rounded-lg border border-green-300 px-3 py-1.5 text-xs font-medium text-green-700 hover:bg-green-100"
            >
              {t("common.cancel")}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
