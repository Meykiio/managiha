import { useEffect, useMemo, useState } from "react";
import { Banknote, AlertTriangle } from "lucide-react";
import { Input } from "../ui/Input";
import { fmtMoney } from "../../lib/format";
import { useAuth } from "../../contexts/AuthContext";
import { callCheckoutSale } from "../../lib/api";
import { newOperationId } from "../../lib/ids";
import { validateCheckout, getTotalFromValidated, type CheckoutItem, type StockShortage } from "../../lib/checkout";
import { t } from "../../i18n";
import type { ScanCartItem } from "../../hooks/useScanCart";

interface CashPaymentProps {
  totalAmount: number;
  items: ScanCartItem[];
  onSuccess: (validatedItems: CheckoutItem[], received: number, change: number) => void;
  onBusyChange?: (busy: boolean) => void;
}

export function CashPayment({ totalAmount, items, onSuccess, onBusyChange }: CashPaymentProps) {
  const { store } = useAuth();
  const [validatedItems, setValidatedItems] = useState<CheckoutItem[] | null>(null);
  const [priceChanged, setPriceChanged] = useState(false);
  const [stockIssues, setStockIssues] = useState<StockShortage[]>([]);
  const [validating, setValidating] = useState(true);
  const [validateError, setValidateError] = useState<string | null>(null);

  const finalTotal = validatedItems ? getTotalFromValidated(validatedItems) : totalAmount;
  const [received, setReceived] = useState(String(finalTotal));
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    setValidating(true);
    validateCheckout(items)
      .then((v) => {
        if (cancelled) return;
        setValidatedItems(v.items);
        setPriceChanged(v.priceChanged);
        setStockIssues(v.stockIssues);
        setValidating(false);
      })
      .catch((err) => {
        if (cancelled) return;
        setValidateError(err instanceof Error ? err.message : t("common.error"));
        setValidating(false);
      });
    return () => { cancelled = true; };
  }, [items]);

  useEffect(() => {
    setReceived(String(finalTotal));
  }, [finalTotal]);

  const receivedNum = Number(received.replace(",", ".")) || 0;
  const change = receivedNum - finalTotal;
  const isValid = receivedNum >= finalTotal && items.length > 0 && stockIssues.length === 0 && !validating;

  // One id per mounted payment attempt. Pressing the button again after a
  // network failure reuses it, so the server replays instead of selling twice.
  const opId = useMemo(() => newOperationId(), []);

  const handleSubmit = async () => {
    if (!isValid || !store || !validatedItems) return;
    setSubmitting(true);
    onBusyChange?.(true);
    setError(null);

    try {
      const checkoutItems = validatedItems.map((item) => ({
        product_id: item.productId,
        quantity: item.quantity,
      }));
      await callCheckoutSale(checkoutItems, "cash", opId, undefined, receivedNum);
      onSuccess(validatedItems, receivedNum, change);
    } catch (err) {
      setError(err instanceof Error ? err.message : t("common.error"));
    } finally {
      setSubmitting(false);
      onBusyChange?.(false);
    }
  };

  if (validating) {
    return (
      <div className="py-8 text-center text-sm text-body-muted">
        {t("scanner.payment.validating")}
      </div>
    );
  }

  if (validateError) {
    return (
      <div className="rounded-lg bg-error-tint px-3 py-2 text-xs text-error-fg">
        {validateError}
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="rounded-lg bg-positive-tint p-4 text-center">
        <p className="text-xs font-medium text-positive-fg">
          {t("scanner.payment.total")}
        </p>
        <p className="mt-1 text-2xl font-bold text-positive-fg">
          {fmtMoney(finalTotal)}
        </p>
      </div>

      {priceChanged && (
        <div className="flex items-start gap-2 rounded-lg bg-warning-tint px-3 py-2">
          <AlertTriangle size={16} className="mt-0.5 shrink-0 text-warning-fg" />
          <p className="text-xs text-warning-fg">
            {t("scanner.payment.priceChanged")}
          </p>
        </div>
      )}

      {stockIssues.length > 0 && (
        <div className="rounded-lg bg-error-tint px-3 py-2">
          <p className="mb-1 text-xs font-medium text-error-fg">
            {t("scanner.payment.stockInsufficient")}
          </p>
          {stockIssues.map((issue, i) => (
            <p key={i} className="text-xs text-error-fg">
              • {t("scanner.payment.stockShortage", {
                name: issue.name,
                current: issue.current,
                needed: issue.needed,
              })}
            </p>
          ))}
        </div>
      )}

      <Input
        label={t("scanner.payment.received")}
        type="number"
        inputMode="decimal"
        step="any"
        min={finalTotal}
        suffix="DZD"
        value={received}
        onChange={(e) => setReceived(e.target.value)}
      />

      {change > 0 && (
        <div className="rounded-lg bg-bg p-3 text-center">
          <p className="text-xs text-body-muted">
            {t("scanner.payment.change")}
          </p>
          <p className="text-lg font-bold text-body">
            {fmtMoney(change)}
          </p>
        </div>
      )}

      {change < 0 && (
        <p className="text-center text-sm text-error-fg">
          {t("scanner.payment.insufficient")}
        </p>
      )}

      {error && (
        <p className="rounded-lg bg-error-tint px-3 py-2 text-xs text-error-fg">
          {error}
        </p>
      )}

      <button
        type="button"
        onClick={handleSubmit}
        disabled={!isValid || submitting}
        className="flex w-full items-center justify-center gap-2 rounded-lg bg-positive px-4 py-3 text-sm font-medium text-onPrimary hover:opacity-90 disabled:opacity-50"
      >
        <Banknote size={18} />
        {submitting ? t("common.loading") : t("scanner.payment.confirmCash")}
      </button>
    </div>
  );
}
