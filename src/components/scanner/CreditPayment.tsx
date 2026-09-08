import { useState } from "react";
import { CreditCard, UserPlus } from "lucide-react";
import { Input } from "../ui/Input";
import { CustomerSelect } from "../carnet/CustomerSelect";
import { fmtMoney } from "../../lib/format";
import { useAuth } from "../../contexts/AuthContext";
import { callAdjustStock, callRecordCarnetTransaction } from "../../lib/api";
import { supabase } from "../../lib/supabaseClient";
import { t } from "../../i18n";
import type { ScanCartItem } from "../../hooks/useScanCart";

interface CreditPaymentProps {
  totalAmount: number;
  items: ScanCartItem[];
  onSuccess: () => void;
}

export function CreditPayment({ totalAmount, items, onSuccess }: CreditPaymentProps) {
  const { store } = useAuth();
  const [customerId, setCustomerId] = useState<string | null>(null);
  const [isNewCustomer, setIsNewCustomer] = useState(false);
  const [newName, setNewName] = useState("");
  const [newPhone, setNewPhone] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [errors, setErrors] = useState<{ customer?: string; newName?: string }>({});

  const handleSubmit = async () => {
    if (!store || items.length === 0) return;

    const nextErrors: typeof errors = {};
    let finalCustomerId = customerId;

    if (isNewCustomer) {
      if (!newName.trim()) nextErrors.newName = "Le nom est obligatoire";
    } else if (!finalCustomerId) {
      nextErrors.customer = "Sélectionnez un client";
    }

    setErrors(nextErrors);
    if (Object.keys(nextErrors).length > 0) return;

    setSubmitting(true);
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
          .select("id")
          .single();
        if (inserted.error) throw new Error(inserted.error.message);
        finalCustomerId = inserted.data.id as string;
      }

      for (const item of items) {
        await callAdjustStock({
          productId: item.product.id,
          movementType: "sale",
          quantity: item.quantity,
          note: `Vente crédit · ${fmtMoney(item.product.sell_price * item.quantity)}`,
        });
      }

      await callRecordCarnetTransaction({
        customerId: finalCustomerId!,
        type: "credit",
        amount: totalAmount,
        note: `Achat scanner · ${items.length} produit(s)`,
      });

      onSuccess();
    } catch (err) {
      setError(err instanceof Error ? err.message : t("common.error"));
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="space-y-4">
      <div className="rounded-lg bg-blue-50 p-4 text-center">
        <p className="text-xs font-medium text-blue-600">
          {t("scanner.payment.total")}
        </p>
        <p className="mt-1 text-2xl font-bold text-blue-800">
          {fmtMoney(totalAmount)}
        </p>
      </div>

      <div>
        <div className="flex items-center justify-between">
          <span className="mb-1.5 block text-sm font-medium text-neutral-700">
            {t("scanner.payment.customer")}
          </span>
          <button
            type="button"
            onClick={() => {
              setIsNewCustomer((v) => !v);
              setCustomerId(null);
              setErrors({});
            }}
            className="text-xs font-semibold text-blue-600 hover:text-blue-700"
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
              <p className="mt-1.5 text-xs font-medium text-red-600">{errors.customer}</p>
            )}
          </>
        )}
      </div>

      {error && (
        <p className="rounded-lg bg-red-50 px-3 py-2 text-xs text-red-600">
          {error}
        </p>
      )}

      <button
        type="button"
        onClick={handleSubmit}
        disabled={(!customerId && !isNewCustomer) || submitting}
        className="flex w-full items-center justify-center gap-2 rounded-lg bg-blue-600 px-4 py-3 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-50"
      >
        <CreditCard size={18} />
        {submitting ? t("common.loading") : t("scanner.payment.confirmCredit")}
      </button>
    </div>
  );
}
