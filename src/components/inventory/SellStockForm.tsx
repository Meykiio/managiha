import { useEffect, useState, type FormEvent } from "react";
import { useAuth } from "../../contexts/AuthContext";
import { useToast } from "../../contexts/ToastContext";
import { Button } from "../ui/Button";
import { Input } from "../ui/Input";
import { Textarea } from "../ui/Textarea";
import { ProductSelect } from "./ProductSelect";
import { callAdjustStock, fetchProductLite, type ProductLite } from "../../lib/api";
import { newOperationId } from "../../lib/ids";
import { submitOrQueue } from "../../lib/offline/submit";
import { fmtMoneyShort } from "../../lib/format";
import type { MovementType } from "../../lib/types";
import { t } from "../../i18n";

export function SellStockForm({ onSuccess }: { onSuccess?: () => void }) {
  const { store } = useAuth();
  const { showToast } = useToast();
  const [productId, setProductId] = useState<string | null>(null);
  const [product, setProduct] = useState<ProductLite | null>(null);
  const [quantity, setQuantity] = useState("");
  const [note, setNote] = useState("");
  const [errors, setErrors] = useState<{ product?: string; quantity?: string }>({});
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (!store || !productId) {
      setProduct(null);
      return;
    }
    let cancelled = false;
    fetchProductLite(store.id, productId)
      .then((row) => {
        if (!cancelled) setProduct(row);
      })
      .catch(() => {
        if (!cancelled) setProduct(null);
      });
    return () => {
      cancelled = true;
    };
  }, [store, productId]);

  if (!store) return null;

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    const nextErrors: typeof errors = {};
    if (!productId) nextErrors.product = t("validate.selectProduct");
    const qty = Number(quantity.replace(",", "."));
    if (quantity === "" || Number.isNaN(qty) || qty <= 0) {
      nextErrors.quantity = t("validate.quantityPositive");
    }
    setErrors(nextErrors);
    if (Object.keys(nextErrors).length > 0 || !productId) return;

    setSubmitting(true);
    try {
      const opId = newOperationId();
      const input = {
        productId,
        movementType: "sale" as MovementType,
        quantity: qty,
        // The ledger stores the price charged in unit_cost, and the till does
        // this through checkout_sale. This form did not, so a sale recorded here
        // carried no price and contributed nothing to revenue — the movements
        // were there, the money was not.
        unitCost: product?.sell_price ?? null,
        note: note.trim() || null,
        clientOpId: opId,
      };
      const outcome = await submitOrQueue("adjust_stock", opId, input, () =>
        callAdjustStock(input)
      );
      showToast(outcome === "queued" ? t("toast.queuedOffline") : t("toast.saleSaved"));
      setQuantity("");
      setNote("");
      onSuccess?.();
    } catch (err) {
      showToast(err instanceof Error ? err.message : t("common.error"), "error");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <ProductSelect
        storeId={store.id}
        value={productId}
        onChange={(id) => setProductId(id)}
        label={t("inventory.adjust.product")}
      />
      {errors.product && (
        <p className="-mt-2 text-xs font-medium text-error-fg">{errors.product}</p>
      )}
      <Input
        label={t("inventory.sell.quantity")}
        type="number"
        inputMode="decimal"
        step="any"
        min="0"
        required
        value={quantity}
        error={errors.quantity}
        hint={
          product
            ? t("inventory.sell.priceHint", { price: fmtMoneyShort(product.sell_price) })
            : undefined
        }
        onChange={(e) => setQuantity(e.target.value)}
      />
      <Textarea
        label={`${t("inventory.sell.note")} (${t("common.optional")})`}
        rows={2}
        value={note}
        onChange={(e) => setNote(e.target.value)}
      />
      <Button type="submit" size="lg" className="w-full" loading={submitting}>
        {t("inventory.sell.submit")}
      </Button>
    </form>
  );
}