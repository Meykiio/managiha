import { useEffect, useState, type FormEvent } from "react";
import { useAuth } from "../../contexts/AuthContext";
import { useToast } from "../../contexts/ToastContext";
import { Button } from "../ui/Button";
import { Input } from "../ui/Input";
import { Select } from "../ui/Select";
import { Textarea } from "../ui/Textarea";
import { ProductSelect } from "./ProductSelect";
import { callAdjustStock, fetchProductLite, type ProductLite } from "../../lib/api";
import { newOperationId } from "../../lib/ids";
import { submitOrQueue } from "../../lib/offline/submit";
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
  /** The chosen row, fetched by id — the picker no longer downloads the catalogue. */
  const [selectedProduct, setSelectedProduct] = useState<ProductLite | null>(null);
  const [errors, setErrors] = useState<{ product?: string; reason?: string; quantity?: string }>({});
  const [submitting, setSubmitting] = useState(false);

  const isRemoval = reason === "damage" || reason === "theft";
  const isCorrection = reason === "correction";
  const isReturn = reason === "return";
  // Quantity is entered positive and the server applies the direction for these;
  // only `correction` carries a sign, because only correction is a delta by nature.
  const isDirectional = isRemoval || isReturn;

  useEffect(() => {
    if (!store || !productId) {
      setSelectedProduct(null);
      return;
    }
    let cancelled = false;
    fetchProductLite(store.id, productId)
      .then((row) => {
        if (!cancelled) setSelectedProduct(row);
      })
      .catch(() => {
        if (!cancelled) setSelectedProduct(null);
      });
    return () => {
      cancelled = true;
    };
  }, [store, productId]);

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    if (!store) return;
    const nextErrors: typeof errors = {};
    if (!productId) nextErrors.product = t("validate.selectProduct");
    if (!reason) nextErrors.reason = t("validate.motiveRequired");
    const qty = Number(quantity.replace(",", "."));
    if (quantity === "" || Number.isNaN(qty)) {
      nextErrors.quantity = t("validate.quantityInvalid");
    } else if (isDirectional && qty <= 0) {
      nextErrors.quantity = t("validate.quantityPositive");
    } else if (isCorrection && qty === 0) {
      nextErrors.quantity = t("validate.correctionZero");
    } else if (reason === "count_adjustment" && qty < 0) {
      nextErrors.quantity = t("validate.quantityNonNegative");
    }
    setErrors(nextErrors);
    if (Object.keys(nextErrors).length > 0 || !productId) return;

    setSubmitting(true);
    try {
      if (reason === "count_adjustment" && selectedProduct && qty === Number(selectedProduct.current_stock)) {
        showToast(t("inventory.adjust.noChange"), "error");
        setSubmitting(false);
        return;
      }
      const opId = newOperationId();
      const input = {
        productId,
        movementType: reason as MovementType,
        quantity: qty,
        note: note.trim() || null,
        clientOpId: opId,
      };
      const outcome = await submitOrQueue("adjust_stock", opId, input, () =>
        callAdjustStock(input)
      );
      showToast(outcome === "queued" ? t("toast.queuedOffline") : t("toast.stockUpdated"));
      setQuantity("");
      setNote("");
      // The picker re-reads the row when it is reopened, so there is no list to
      // refresh here — only the figure shown under it.
      if (store && productId) {
        fetchProductLite(store.id, productId)
          .then(setSelectedProduct)
          .catch(() => setSelectedProduct(null));
      }
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
        <p className="-mt-2 text-xs font-medium text-error-fg">{errors.product}</p>
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
              : isReturn
                ? t("inventory.adjust.returnQty")
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
            isReturn
              ? t("inventory.adjust.returnHint")
              : !isRemoval && selectedProduct
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
