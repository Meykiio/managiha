import { useEffect, useMemo, useState } from "react";
import { CreditCard, AlertTriangle } from "lucide-react";
import { Input } from "../ui/Input";
import { CustomerSelect } from "../carnet/CustomerSelect";
import { fmtMoney } from "../../lib/format";
import { useAuth } from "../../contexts/AuthContext";
import { callCheckoutSale } from "../../lib/api";
import { newOperationId } from "../../lib/ids";
import { validateCheckout, getTotalFromValidated, type CheckoutItem, type StockShortage } from "../../lib/checkout";
import { supabase } from "../../lib/supabaseClient";
import { t } from "../../i18n";
import type { ScanCartItem } from "../../hooks/useScanCart";

interface CreditPaymentProps {
  totalAmount: number;
  items: ScanCartItem[];
  onSuccess: (validatedItems: CheckoutItem[], customerName: string) => void;
  onBusyChange?: (busy: boolean) => void;
}

export function CreditPayment({ totalAmount, items, onSuccess, onBusyChange }: CreditPaymentProps) {
  const { store } = useAuth();
  const [validatedItems, setValidatedItems] = useState<CheckoutItem[] | null>(null);
  const [priceChanged, setPriceChanged] = useState(false);
  const [stockIssues, setStockIssues] = useState<StockShortage[]>([]);
  const [validating, setValidating] = useState(true);
  const [validateError, setValidateError] = useState<string | null>(null);

  const finalTotal = validatedItems ? getTotalFromValidated(validatedItems) : totalAmount;

  const [customerId, setCustomerId] = useState<string | null>(null);
  const [isNewCustomer, setIsNewCustomer] = useState(false);
  const [newName, setNewName] = useState("");
  const [newPhone, setNewPhone] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [errors, setErrors] = useState<{ customer?: string; newName?: string }>({});

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

  // One id per mounted payment attempt. Pressing the button again after a
  // network failure reuses it, so the server replays instead of charging twice.
  const opId = useMemo(() => newOperationId(), []);

  const handleSubmit = async () => {
    if (!store || !validatedItems) return;

    const nextErrors: typeof errors = {};
    let finalCustomerId = customerId;
    let finalCustomerName = "";

    if (isNewCustomer) {
      if (!newName.trim()) nextErrors.newName = t("validate.nameRequired");
      finalCustomerName = newName.trim();
    } else if (!finalCustomerId) {
      nextErrors.customer = t("validate.selectCustomer");
    }

    setErrors(nextErrors);
    if (Object.keys(nextErrors).length > 0) return;

    setSubmitting(true);
    onBusyChange?.(true);
    setError(null);

    try {
      if (isNewCustomer) {
        const inserted = await supabase
          .from("carnet_customers")
          .insert({
            store_id: store.id,
            full_name: newName.trim(),
            phone: newPhone.trim() || null,
          })
          .select("id, full_name")
          .single();
        if (inserted.error) throw new Error(inserted.error.message);
        finalCustomerId = inserted.data.id as string;
        finalCustomerName = inserted.data.full_name as string;
      } else {
        // Fetch customer name for receipt
        const { data: customer } = await supabase
          .from("carnet_customers")
          .select("full_name")
          .eq("id", finalCustomerId!)
          .single();
        finalCustomerName = customer?.full_name ?? "";
      }

      const checkoutItems = validatedItems.map((item) => ({
        product_id: item.productId,
        quantity: item.quantity,
      }));
      await callCheckoutSale(checkoutItems, "credit", opId, finalCustomerId!);

      onSuccess(validatedItems, finalCustomerName);
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
      <div className="rounded-lg bg-info-tint p-4 text-center">
        <p className="text-xs font-medium text-info-fg">
          {t("scanner.payment.total")}
        </p>
        <p className="mt-1 text-2xl font-bold text-info-fg">
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

      <div>
        <div className="flex items-center justify-between">
          <span className="mb-1.5 block text-sm font-medium text-body-soft">
            {t("scanner.payment.customer")}
          </span>
          <button
            type="button"
            onClick={() => {
              setIsNewCustomer((v) => !v);
              setCustomerId(null);
              setErrors({});
            }}
            className="text-xs font-semibold text-info-fg hover:text-info-fg"
          >
            {isNewCustomer ? t("scanner.payment.selectExisting") : t("scanner.payment.newCustomer")}
          </button>
        </div>

        {isNewCustomer ? (
          <div className="grid gap-3 sm:grid-cols-2">
            <Input
              placeholder={t("scanner.payment.newCustomerName")}
              required
              value={newName}
              error={errors.newName}
              onChange={(e) => setNewName(e.target.value)}
            />
            <Input
              placeholder={t("scanner.payment.newCustomerPhone")}
              type="tel"
              value={newPhone}
              onChange={(e) => setNewPhone(e.target.value)}
            />
          </div>
        ) : (
          <>
            <CustomerSelect
              storeId={store?.id ?? ""}
              value={customerId}
              onChange={(id) => setCustomerId(id)}
            />
            {errors.customer && (
              <p className="mt-1.5 text-xs font-medium text-error-fg">{errors.customer}</p>
            )}
          </>
        )}
      </div>

      {error && (
        <p className="rounded-lg bg-error-tint px-3 py-2 text-xs text-error-fg">
          {error}
        </p>
      )}

      <button
        type="button"
        onClick={handleSubmit}
        disabled={(!customerId && !isNewCustomer) || submitting || stockIssues.length > 0}
        className="flex w-full items-center justify-center gap-2 rounded-lg bg-info px-4 py-3 text-sm font-medium text-onPrimary hover:bg-info disabled:opacity-50"
      >
        <CreditCard size={18} />
        {submitting ? t("common.loading") : t("scanner.payment.confirmCredit")}
      </button>
    </div>
  );
}
