import { Minus, Plus, Trash2 } from "lucide-react";
import type { ScanCartItem } from "../../hooks/useScanCart";
import { fmtMoney } from "../../lib/format";
import { t } from "../../i18n";

interface ScanCartProps {
  items: ScanCartItem[];
  totalItems: number;
  totalAmount: number;
  onUpdateQuantity: (productId: string, quantity: number) => void;
  onRemoveItem: (productId: string) => void;
}

export function ScanCart({
  items,
  totalItems,
  totalAmount,
  onUpdateQuantity,
  onRemoveItem,
}: ScanCartProps) {
  if (items.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-12 text-center">
        <div className="mb-3 flex h-16 w-16 items-center justify-center rounded-full bg-neutral-100">
          <span className="text-2xl">🛒</span>
        </div>
        <p className="text-sm font-medium text-neutral-700">
          {t("scanner.cart.empty")}
        </p>
        <p className="mt-1 text-xs text-neutral-500">
          {t("scanner.cart.emptyHint")}
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <p className="text-sm font-medium text-neutral-700">
          {t("scanner.cart.title", { count: totalItems })}
        </p>
        <p className="text-sm font-bold text-blue-600">
          {fmtMoney(totalAmount)}
        </p>
      </div>

      <div className="space-y-2">
        {items.map((item) => (
          <div
            key={item.product.id}
            className="flex items-center justify-between rounded-lg border border-neutral-200 bg-white p-3"
          >
            <div className="min-w-0 flex-1">
              <p className="truncate text-sm font-medium text-neutral-800">
                {item.product.name}
              </p>
              <p className="text-xs text-neutral-500">
                {fmtMoney(item.product.sell_price)} × {item.quantity} ={" "}
                <span className="font-semibold text-neutral-800">
                  {fmtMoney(item.product.sell_price * item.quantity)}
                </span>
              </p>
            </div>

            <div className="ml-3 flex items-center gap-1">
              <button
                type="button"
                onClick={() =>
                  onUpdateQuantity(item.product.id, item.quantity - 1)
                }
                className="flex h-8 w-8 items-center justify-center rounded-lg bg-neutral-100 text-neutral-600 hover:bg-neutral-200"
              >
                <Minus size={14} />
              </button>
              <span className="w-8 text-center text-sm font-bold">
                {item.quantity}
              </span>
              <button
                type="button"
                onClick={() =>
                  onUpdateQuantity(item.product.id, item.quantity + 1)
                }
                className="flex h-8 w-8 items-center justify-center rounded-lg bg-neutral-100 text-neutral-600 hover:bg-neutral-200"
              >
                <Plus size={14} />
              </button>
              <button
                type="button"
                onClick={() => onRemoveItem(item.product.id)}
                className="ml-1 flex h-8 w-8 items-center justify-center rounded-lg bg-red-50 text-red-500 hover:bg-red-100"
              >
                <Trash2 size={14} />
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
