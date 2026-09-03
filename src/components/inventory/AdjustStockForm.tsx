import { useCallback, useEffect, useState, type FormEvent } from "react";
import { useAuth } from "../../contexts/AuthContext";
import { useToast } from "../../contexts/ToastContext";
import { Button } from "../ui/Button";
import { Input } from "../ui/Input";
import { Select } from "../ui/Select";
import { Textarea } from "../ui/Textarea";
import { ProductSelect } from "./ProductSelect";
import { callAdjustStock, fetchActiveProductsLite, type ProductLite } from "../../lib/api";
import { ADJUST_REASONS } from "../../lib/constants";
import { fmtQty } from "../../lib/format";
import { unitShort } from "../../lib/constants";
import type { MovementType } from "../../lib/types";
import { t } from "../../i18n";

interface AdjustStockFormProps {
  onSuccess?: () => void;
}

export function AdjustStockForm({ onSuccess }: AdjustStockFormProps) {
  const { store } = useAuth();
  const { showToast } = useToast();
  const [productId, setProductId] = useState<string | null>(null);
  const [reason, setReason] = useState("");
  const [quantity, setQuantity] = useState("");
  const [note, setNote] = useState("");
  const [products, setProducts] = useState<ProductLite[]>([]);
  const [errors, setErrors] = useState<{ product?: string; reason?: string; quantity?: string }>({});
  const [submitting, setSubmitting] = useState(false);

  const selectedProduct = products.find((p) => p.id === productId) ?? null;
  const isRemoval = reason === "damage" || reason === "theft";
  const isCorrection = reason === "correction";

  const loadProducts = useCallback(async () => {
    if (!store) return;
    try {
      setProducts(await fetchActiveProductsLite(store.id));
    } catch {
      setProducts([]);
    }
  }, [store]);

  useEffect(() => {
    loadProducts();
  }, [loadProducts]);

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    if (!store) return;
    const nextErrors: typeof errors = {};
    if (!productId) nextErrors.product = t("validation.selectProduct");
    if (!reason) nextErrors.reason = t("validation.reasonRequired");
    const qty = Number(quantity.replace(",", "."));
    if (quantity === "" || Number.isNaN(qty)) {
      nextErrors.quantity = t("validation.qtyInvalid");
    } else if (isRemoval && qty <= 0) {
      nextErrors.quantity = t("validation.qtyPositive");
    } else if (isCorrection && qty === 0) {
      nextErrors.quantity = t("validation.correctionNotZero");
    } else if (reason === "count_adjustment" && qty < 0) {
      nextErrors.quantity = t("validation.qtyNotNegative");
    }
    setErrors(nextErrors);
    if (Object.keys(nextErrors).length > 0 || !productId) return;

    setSubmitting(true);
    try {
      if (reason === "count_adjustment" && selectedProduct && qty === Number(selectedProduct.current_stock)) {
        showToast(t("validation.noStockChange"), "error");
        setSubmitting(false);
        return;
      }
      await callAdjustStock({
        productId,
        movementType: reason as MovementType,
        quantity: qty,
        note: note.trim() || null,
      });
      showToast(t("toast.stockUpdated"));
      setQuantity("");
      setNote("");
      await loadProducts();
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
        onChange={(id) => {
          setProductId(id);
          setQuantity("");
        }}
        label={t("inventory.adjust.product")}
      />
      {errors.product && (
        <p className="-mt-2 text-xs font-medium text-red-600">{errors.product}</p>
      )}
      <Select
        label={`${t("inventory.adjust.reason")} *`}
        required
        value={reason}
        error={errors.reason}
        onChange={(e) => setReason(e.target.value)}
      >
        <option value="" disabled>
          {t("inventory.adjust.reasonPlaceholder")}
        </option>
        {ADJUST_REASONS.map((r) => (
          <option key={r.value} value={r.value}>
            {t(r.labelKey)}
          </option>
        ))}
      </Select>
      {reason && (
        <Input
          label={
            isRemoval
              ? t("inventory.adjust.removeQty")
              : isCorrection
                ? t("inventory.adjust.correctionQty")
                : t("inventory.adjust.newQty")
          }
          type="number"
          inputMode="decimal"
          step="any"
          min={isCorrection ? undefined : "0"}
          required
          hint={
            !isRemoval && selectedProduct
              ? t("inventory.adjust.newQtyHint", {
                  qty: `${fmtQty(selectedProduct.current_stock)} ${unitShort(selectedProduct.unit)}`,
                })
              : undefined
          }
          value={quantity}
          error={errors.quantity}
          suffix={selectedProduct ? unitShort(selectedProduct.unit) : undefined}
          onChange={(e) => setQuantity(e.target.value)}
        />
      )}
      <Textarea
        label={`${t("common.notes")} (${t("common.optional")})`}
        rows={2}
        value={note}
        onChange={(e) => setNote(e.target.value)}
      />
      <Button type="submit" size="lg" className="w-full" loading={submitting}>
        {t("inventory.adjust.submit")}
      </Button>
    </form>
  );
}
