import { Minus, Plus, Trash2 } from "lucide-react";
import { fmtMoney } from "../../lib/format";
import { t } from "../../i18n";
import type { ScanCartItem } from "../../hooks/useScanCart";

interface CartLinesProps {
  items: ScanCartItem[];
  onUpdateQuantity: (productId: string, quantity: number) => void;
  onRemoveItem: (productId: string) => void;
}

export function CartLines({ items, onUpdateQuantity, onRemoveItem }: CartLinesProps) {
  return (
    <ul className="max-h-48 divide-y divide-line-hi overflow-y-auto border-t border-line-hi bg-body">
      {items.map((item) => (
        <li
          key={item.product.id}
          className="flex items-center justify-between px-4 py-3"
        >
          <div className="min-w-0 flex-1">
            <p className="truncate text-sm font-medium text-onPrimary">{item.product.name}</p>
            <p className="text-xs text-body-muted">
              {fmtMoney(item.product.sell_price)} × {item.quantity}
            </p>
          </div>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => onUpdateQuantity(item.product.id, item.quantity - 1)}
              className="flex h-11 w-11 items-center justify-center rounded-lg bg-body-soft text-onPrimary hover:bg-body-soft"
              aria-label={`${t("common.decrease")} ${item.product.name}`}
            >
              <Minus className="h-5 w-5" />
            </button>
            <span className="w-8 text-center text-sm font-medium text-onPrimary">
              {item.quantity}
            </span>
            <button
              type="button"
              onClick={() => onUpdateQuantity(item.product.id, item.quantity + 1)}
              className="flex h-11 w-11 items-center justify-center rounded-lg bg-body-soft text-onPrimary hover:bg-body-soft"
              aria-label={`${t("common.increase")} ${item.product.name}`}
            >
              <Plus className="h-5 w-5" />
            </button>
            <button
              type="button"
              onClick={() => onRemoveItem(item.product.id)}
              className="flex h-11 w-11 items-center justify-center rounded-lg bg-error/20 text-error-fg hover:bg-error/30"
              aria-label={`${t("common.delete")} ${item.product.name}`}
            >
              <Trash2 className="h-5 w-5" />
            </button>
          </div>
        </li>
      ))}
    </ul>
  );
}