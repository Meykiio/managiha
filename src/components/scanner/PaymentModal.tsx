import { useState } from "react";
import { Modal } from "../ui/Modal";
import { CashPayment } from "./CashPayment";
import { CreditPayment } from "./CreditPayment";
import { t } from "../../i18n";
import { cn } from "../../lib/utils";
import type { ScanCartItem } from "../../hooks/useScanCart";
import type { CheckoutItem } from "../../lib/checkout";

type PaymentMode = "cash" | "credit";

interface SaleDetails {
  items: CheckoutItem[];
  totalAmount: number;
  paymentMode: "cash" | "credit";
  amountReceived?: number;
  change?: number;
  customerName?: string;
}

interface PaymentModalProps {
  open: boolean;
  onClose: () => void;
  items: ScanCartItem[];
  totalAmount: number;
  onSuccess: (sale: SaleDetails) => void;
}

export function PaymentModal({
  open,
  onClose,
  items,
  totalAmount,
  onSuccess,
}: PaymentModalProps) {
  const [mode, setMode] = useState<PaymentMode>("cash");
  const [busy, setBusy] = useState(false);

  return (
    <Modal
      open={open}
      onClose={onClose}
      title={t("scanner.payment.title")}
      size="md"
      busy={busy}
    >
      <div className="space-y-4">
        <div className="grid grid-cols-2 gap-2">
          <button
            type="button"
            onClick={() => setMode("cash")}
            className={cn(
              "rounded-lg border px-4 py-3 text-center transition",
              mode === "cash"
                ? "border-positive bg-positive-tint ring-1 ring-positive"
                : "border-line-hi hover:border-line-hi"
            )}
          >
            <span
              className={cn(
                "block text-sm font-semibold",
                mode === "cash" ? "text-positive-fg" : "text-body"
              )}
            >
              {t("scanner.payment.cash")}
            </span>
            <span className="mt-0.5 block text-xs text-body-muted">
              {t("scanner.payment.cashHint")}
            </span>
          </button>
          <button
            type="button"
            onClick={() => setMode("credit")}
            className={cn(
              "rounded-lg border px-4 py-3 text-center transition",
              mode === "credit"
                ? "border-info bg-info-tint ring-1 ring-info"
                : "border-line-hi hover:border-line-hi"
            )}
          >
            <span
              className={cn(
                "block text-sm font-semibold",
                mode === "credit" ? "text-info-fg" : "text-body"
              )}
            >
              {t("scanner.payment.credit")}
            </span>
            <span className="mt-0.5 block text-xs text-body-muted">
              {t("scanner.payment.creditHint")}
            </span>
          </button>
        </div>

        {mode === "cash" && (
          <CashPayment
            totalAmount={totalAmount}
            items={items}
            onBusyChange={setBusy}
            onSuccess={(validatedItems, received, change) =>
              onSuccess({
                items: validatedItems,
                totalAmount: validatedItems.reduce((s, i) => s + i.priceAtCheckout * i.quantity, 0),
                paymentMode: "cash",
                amountReceived: received,
                change,
              })
            }
          />
        )}
        {mode === "credit" && (
          <CreditPayment
            totalAmount={totalAmount}
            items={items}
            onBusyChange={setBusy}
            onSuccess={(validatedItems, customerName) =>
              onSuccess({
                items: validatedItems,
                totalAmount: validatedItems.reduce((s, i) => s + i.priceAtCheckout * i.quantity, 0),
                paymentMode: "credit",
                customerName,
              })
            }
          />
        )}
      </div>
    </Modal>
  );
}
