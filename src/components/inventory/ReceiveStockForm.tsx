import { useEffect, useState, type FormEvent } from "react";
import { useAuth } from "../../contexts/AuthContext";
import { useToast } from "../../contexts/ToastContext";
import { Button } from "../ui/Button";
import { Input } from "../ui/Input";
import { Select } from "../ui/Select";
import { Textarea } from "../ui/Textarea";
import { ProductSelect } from "./ProductSelect";
import { callAdjustStock, fetchSuppliers } from "../../lib/api";
import { supabase } from "../../lib/supabaseClient";
import { newOperationId } from "../../lib/ids";
import { submitOrQueue } from "../../lib/offline/submit";
import type { Supplier } from "../../lib/types";
import { t } from "../../i18n";

interface ReceiveStockFormProps {
  presetProductId?: string | null;
  onSuccess?: () => void;
}

export function ReceiveStockForm({ presetProductId, onSuccess }: ReceiveStockFormProps) {
  const { store } = useAuth();
  const { showToast } = useToast();
  const [productId, setProductId] = useState<string | null>(presetProductId ?? null);
  const [quantity, setQuantity] = useState("");
  const [unitCost, setUnitCost] = useState("");
  const [supplierId, setSupplierId] = useState("");
  const [expiryDate, setExpiryDate] = useState("");
  const [lotCode, setLotCode] = useState("");
  const [note, setNote] = useState("");
  const [suppliers, setSuppliers] = useState<Supplier[]>([]);
  const [errors, setErrors] = useState<{ product?: string; quantity?: string }>({});
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (!store) return;
    fetchSuppliers(store.id)
      .then(setSuppliers)
      .catch(() => setSuppliers([]));
  }, [store]);

  useEffect(() => {
    if (presetProductId) setProductId(presetProductId);
  }, [presetProductId]);

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    if (!store) return;
    const nextErrors: typeof errors = {};
    if (!productId) nextErrors.product = t("validate.selectProduct");
    const qty = Number(quantity.replace(",", "."));
    if (!quantity || Number.isNaN(qty) || qty <= 0)
      nextErrors.quantity = t("validate.quantityPositive");
    setErrors(nextErrors);
    if (Object.keys(nextErrors).length > 0) return;

    setSubmitting(true);
    try {
      const opId = newOperationId();
      const input = {
        productId: productId!,
        movementType: "receive" as const,
        quantity: qty,
        unitCost: unitCost ? Number(unitCost.replace(",", ".")) : null,
        note: note.trim() || null,
        clientOpId: opId,
        // Without these the server has to guess the lot from the product's single
        // `expiry_date` column, which cannot describe three deliveries of the same
        // yoghurt arriving three weeks apart. The whole FEFO path was unreachable
        // from the UI until this form sent a date per delivery.
        expiryDate: expiryDate || null,
        lotCode: lotCode.trim() || null,
      };
      const outcome = await submitOrQueue("adjust_stock", opId, input, () =>
        callAdjustStock(input)
      );
      if (supplierId) {
        await supabase.from("products").update({ supplier_id: supplierId }).eq("id", productId!);
      }
      showToast(outcome === "queued" ? t("toast.queuedOffline") : t("toast.stockUpdated"));
      setQuantity("");
      setUnitCost("");
      setExpiryDate("");
      setLotCode("");
      setNote("");
      onSuccess?.();
    } catch (err) {
      showToast(err instanceof Error ? err.message : t("common.error"), "error");
    } finally {
      setSubmitting(false);
    }
  };

  if (!store) return null;

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <ProductSelect
        storeId={store.id}
        value={productId}
        onChange={(id) => setProductId(id)}
        label={t("inventory.receive.product")}
      />
      {errors.product && (
        <p className="-mt-2 text-xs font-medium text-error-fg">{errors.product}</p>
      )}
      <div className="grid gap-4 sm:grid-cols-2">
        <Input
          label={t("inventory.receive.quantity")}
          type="number"
          inputMode="decimal"
          step="any"
          min="0"
          required
          value={quantity}
          error={errors.quantity}
          onChange={(e) => setQuantity(e.target.value)}
        />
        <Input
          label={`${t("inventory.receive.unitCost")} (${t("common.optional")})`}
          type="number"
          inputMode="decimal"
          step="any"
          min="0"
          suffix="DZD"
          value={unitCost}
          onChange={(e) => setUnitCost(e.target.value)}
        />
      </div>
      <Select
        label={`${t("inventory.receive.supplier")} (${t("common.optional")})`}
        hint={t("inventory.receive.supplierHint")}
        value={supplierId}
        onChange={(e) => setSupplierId(e.target.value)}
      >
        <option value="">—</option>
        {suppliers.map((s) => (
          <option key={s.id} value={s.id}>
            {s.name}
          </option>
        ))}
      </Select>
      <div className="grid gap-4 sm:grid-cols-2">
        <Input
          label={`${t("inventory.receive.expiryDate")} (${t("common.optional")})`}
          type="date"
          hint={t("inventory.receive.expiryHint")}
          value={expiryDate}
          onChange={(e) => setExpiryDate(e.target.value)}
        />
        <Input
          label={`${t("inventory.receive.lotCode")} (${t("common.optional")})`}
          placeholder={t("inventory.receive.lotCodePlaceholder")}
          value={lotCode}
          onChange={(e) => setLotCode(e.target.value)}
        />
      </div>
      <Textarea
        label={`${t("inventory.receive.note")} (${t("common.optional")})`}
        rows={2}
        value={note}
        onChange={(e) => setNote(e.target.value)}
      />
      <Button type="submit" size="lg" className="w-full" loading={submitting}>
        {t("inventory.receive.submit")}
      </Button>
    </form>
  );
}
