import { useState } from "react";
import { Banknote } from "lucide-react";
import { Input } from "../ui/Input";
import { fmtMoney } from "../../lib/format";
import { useAuth } from "../../contexts/AuthContext";
import { callAdjustStock } from "../../lib/api";
import { t } from "../../i18n";
import type { ScanCartItem } from "../../hooks/useScanCart";

interface CashPaymentProps {
  totalAmount: number;
  items: ScanCartItem[];
  onSuccess: () => void;
}

export function CashPayment({ totalAmount, items, onSuccess }: CashPaymentProps) {
  const { store } = useAuth();
  const [received, setReceived] = useState(String(totalAmount));
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const receivedNum = Number(received.replace(",", ".")) || 0;
  const change = receivedNum - totalAmount;
  const isValid = receivedNum >= totalAmount && items.length > 0;

  const handleSubmit = async () => {
    if (!isValid || !store) return;
    setSubmitting(true);
    setError(null);

    try {
      for (const item of items) {
        await callAdjustStock({
          productId: item.product.id,
          movementType: "sale",
          quantity: item.quantity,
          note: `Vente espèces · ${fmtMoney(item.product.sell_price * item.quantity)}`,
        });
      }
      onSuccess();
    } catch (err) {
      setError(err instanceof Error ? err.message : t("common.error"));
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="space-y-4">
      <div className="rounded-lg bg-green-50 p-4 text-center">
        <p className="text-xs font-medium text-green-600">
          {t("scanner.payment.total")}
        </p>
        <p className="mt-1 text-2xl font-bold text-green-800">
          {fmtMoney(totalAmount)}
        </p>
      </div>

      <Input
        label={t("scanner.payment.received")}
        type="number"
        inputMode="decimal"
        step="any"
        min={totalAmount}
        suffix="DZD"
        value={received}
        onChange={(e) => setReceived(e.target.value)}
      />

      {change > 0 && (
        <div className="rounded-lg bg-neutral-50 p-3 text-center">
          <p className="text-xs text-neutral-500">
            {t("scanner.payment.change")}
          </p>
          <p className="text-lg font-bold text-neutral-800">
            {fmtMoney(change)}
          </p>
        </div>
      )}

      {change < 0 && (
        <p className="text-center text-sm text-red-600">
          {t("scanner.payment.insufficient")}
        </p>
      )}

      {error && (
        <p className="rounded-lg bg-red-50 px-3 py-2 text-xs text-red-600">
          {error}
        </p>
      )}

      <button
        type="button"
        onClick={handleSubmit}
        disabled={!isValid || submitting}
        className="flex w-full items-center justify-center gap-2 rounded-lg bg-green-600 px-4 py-3 text-sm font-medium text-white hover:bg-green-700 disabled:opacity-50"
      >
        <Banknote size={18} />
        {submitting ? t("common.loading") : t("scanner.payment.confirmCash")}
      </button>
    </div>
  );
}
