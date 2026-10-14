import { CheckCircle, Banknote, CreditCard } from "lucide-react";
import { Modal } from "../ui/Modal";
import { fmtMoney, fmtDateTime } from "../../lib/format";
import { useAuth } from "../../contexts/AuthContext";
import { t } from "../../i18n";
import type { CheckoutItem } from "../../lib/checkout";

interface ReceiptSummaryProps {
  open: boolean;
  onClose: () => void;
  items: CheckoutItem[];
  totalAmount: number;
  paymentMode: "cash" | "credit";
  amountReceived?: number;
  change?: number;
  customerName?: string;
}

export function ReceiptSummary({
  open,
  onClose,
  items,
  totalAmount,
  paymentMode,
  amountReceived,
  change,
  customerName,
}: ReceiptSummaryProps) {
  const { store } = useAuth();

  return (
    <Modal open={open} onClose={onClose} size="md">
      <div className="space-y-4">
        <div className="flex flex-col items-center gap-2 py-2">
          <div className="flex h-12 w-12 items-center justify-center rounded-full bg-positive-tint">
            <CheckCircle size={24} className="text-positive-fg" />
          </div>
          <p className="text-sm font-medium text-positive-fg">
            {t("receipt.success")}
          </p>
        </div>

        <div className="rounded-lg border border-line bg-bg p-4">
          <div className="mb-3 text-center">
            <p className="text-sm font-bold text-body">
              {store?.name ?? "Managiha"}
            </p>
            <p className="text-xs text-body-muted">
              {fmtDateTime(new Date().toISOString())}
            </p>
          </div>

          <div className="space-y-2 border-t border-line pt-3">
            {items.map((item) => (
              <div key={item.productId} className="flex items-center justify-between text-sm">
                <span className="text-body-soft">
                  {item.name} × {item.quantity}
                </span>
                <span className="font-medium text-body">
                  {fmtMoney(item.priceAtCheckout * item.quantity)}
                </span>
              </div>
            ))}
          </div>

          <div className="mt-3 border-t border-line pt-3">
            <div className="flex items-center justify-between">
              <span className="text-sm font-bold text-body">
                {t("receipt.total")}
              </span>
              <span className="text-sm font-bold text-body">
                {fmtMoney(totalAmount)}
              </span>
            </div>
          </div>
        </div>

        <div className="flex items-center justify-center gap-2 text-sm text-body-soft">
          {paymentMode === "cash" ? (
            <>
              <Banknote size={16} className="text-positive-fg" />
              <span>{t("receipt.cash")}</span>
            </>
          ) : (
            <>
              <CreditCard size={16} className="text-info-fg" />
              <span>{t("receipt.credit")} · {customerName}</span>
            </>
          )}
        </div>

        {paymentMode === "cash" && amountReceived !== undefined && (
          <div className="rounded-lg bg-bg p-3 text-center text-sm">
            <span className="text-body-muted">{t("receipt.received")}: </span>
            <span className="font-medium">{fmtMoney(amountReceived)}</span>
            {change !== undefined && change > 0 && (
              <>
                <span className="mx-2 text-body-muted">·</span>
                <span className="text-body-muted">{t("receipt.change")}: </span>
                <span className="font-medium">{fmtMoney(change)}</span>
              </>
            )}
          </div>
        )}

        {paymentMode === "credit" && (
          <p className="text-center text-xs text-body-muted">
            {t("receipt.creditNote")}
          </p>
        )}

        <button
          type="button"
          onClick={onClose}
          className="w-full rounded-lg bg-surface-high px-4 py-3 text-sm font-medium text-body-soft hover:bg-surface-highest"
        >
          {t("receipt.close")}
        </button>
      </div>
    </Modal>
  );
}
