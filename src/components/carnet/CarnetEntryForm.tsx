import { useState, type FormEvent } from "react";
import { useAuth } from "../../contexts/AuthContext";
import { useToast } from "../../contexts/ToastContext";
import { Button } from "../ui/Button";
import { Input } from "../ui/Input";
import { Textarea } from "../ui/Textarea";
import { CustomerSelect } from "./CustomerSelect";
import { callRecordCarnetTransaction } from "../../lib/api";
import { supabase } from "../../lib/supabaseClient";
import type { TransactionType } from "../../lib/types";
import { t } from "../../i18n";
import { cn } from "../../lib/utils";

interface CarnetEntryFormProps {
  presetCustomerId?: string | null;
  presetType?: TransactionType;
  onSuccess?: () => void;
}

export function CarnetEntryForm({
  presetCustomerId,
  presetType,
  onSuccess,
}: CarnetEntryFormProps) {
  const { store } = useAuth();
  const { showToast } = useToast();
  const [customerId, setCustomerId] = useState<string | null>(presetCustomerId ?? null);
  const [type, setType] = useState<TransactionType>(presetType ?? "credit");
  const [amount, setAmount] = useState("");
  const [note, setNote] = useState("");
  const [isNewCustomer, setIsNewCustomer] = useState(!presetCustomerId ? false : false);
  const [newName, setNewName] = useState("");
  const [newPhone, setNewPhone] = useState("");
  const [errors, setErrors] = useState<{ customer?: string; amount?: string; newName?: string }>({});
  const [submitting, setSubmitting] = useState(false);

  const toggleNewCustomer = () => {
    setIsNewCustomer((v) => !v);
    setCustomerId(null);
    setErrors({});
  };

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    if (!store) return;
    const nextErrors: typeof errors = {};
    let finalCustomerId = customerId;

    if (isNewCustomer) {
      if (!newName.trim()) nextErrors.newName = "Le nom est obligatoire";
    } else if (!finalCustomerId) {
      nextErrors.customer = "Sélectionnez un client";
    }

    const parsedAmount = Number(amount.replace(",", "."));
    if (!amount || Number.isNaN(parsedAmount) || parsedAmount <= 0)
      nextErrors.amount = "Entrez un montant supérieur à 0";

    setErrors(nextErrors);
    if (Object.keys(nextErrors).length > 0) return;

    setSubmitting(true);
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
      await callRecordCarnetTransaction({
        customerId: finalCustomerId!,
        type,
        amount: parsedAmount,
        note: note.trim() || null,
      });
      showToast(t("toast.entrySaved"));
      setAmount("");
      setNote("");
      setIsNewCustomer(false);
      setNewName("");
      setNewPhone("");
      onSuccess?.();
    } catch (err) {
      showToast(err instanceof Error ? err.message : t("common.error"), "error");
    } finally {
      setSubmitting(false);
    }
  };

  const typeOptions: { value: TransactionType; label: string; help: string }[] = [
    { value: "credit", label: t("carnetEntry.typeCredit"), help: t("carnetEntry.typeCreditHelp") },
    { value: "payment", label: t("carnetEntry.typePayment"), help: t("carnetEntry.typePaymentHelp") },
  ];

  if (!store) return null;

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div>
        <div className="flex items-center justify-between">
          <span className="mb-1.5 block text-sm font-medium text-neutral-700">
            {t("carnetEntry.customer")}
          </span>
          {!presetCustomerId && (
            <button
              type="button"
              onClick={toggleNewCustomer}
              className="text-xs font-semibold text-primary-600 hover:text-primary-700"
            >
              {t("carnetEntry.newCustomerToggle")}
            </button>
          )}
        </div>
        {isNewCustomer ? (
          <div className="grid gap-3 sm:grid-cols-2">
            <Input
              placeholder={t("carnetEntry.newCustomerName")}
              required
              value={newName}
              error={errors.newName}
              onChange={(e) => setNewName(e.target.value)}
            />
            <Input
              placeholder={t("carnetEntry.newCustomerPhone")}
              type="tel"
              value={newPhone}
              onChange={(e) => setNewPhone(e.target.value)}
            />
          </div>
        ) : (
          <>
            <CustomerSelect
              storeId={store.id}
              value={customerId}
              onChange={(id) => setCustomerId(id)}
            />
            {errors.customer && (
              <p className="mt-1.5 text-xs font-medium text-red-600">{errors.customer}</p>
            )}
          </>
        )}
      </div>

      <div>
        <span className="mb-1.5 block text-sm font-medium text-neutral-700">
          {t("carnetEntry.type")}
        </span>
        <div className="grid grid-cols-2 gap-3">
          {typeOptions.map((opt) => (
            <button
              key={opt.value}
              type="button"
              onClick={() => setType(opt.value)}
              className={cn(
                "rounded-lg border px-4 py-3 text-start transition",
                type === opt.value
                  ? "border-primary-500 bg-primary-50 ring-1 ring-primary-500"
                  : "border-neutral-300 hover:border-neutral-400"
              )}
            >
              <span
                className={cn(
                  "block text-sm font-semibold",
                  type === opt.value ? "text-primary-700" : "text-neutral-800"
                )}
              >
                {opt.label}
              </span>
              <span className="mt-0.5 block text-xs text-neutral-500">{opt.help}</span>
            </button>
          ))}
        </div>
      </div>

      <Input
        label={t("carnetEntry.amount")}
        type="number"
        inputMode="decimal"
        step="any"
        min="0"
        required
        suffix="DZD"
        value={amount}
        error={errors.amount}
        onChange={(e) => setAmount(e.target.value)}
      />
      <Textarea
        label={`${t("carnetEntry.note")} (${t("common.optional")})`}
        rows={2}
        value={note}
        onChange={(e) => setNote(e.target.value)}
      />
      <Button type="submit" size="lg" className="w-full" loading={submitting}>
        {t("carnetEntry.submit")}
      </Button>
    </form>
  );
}
