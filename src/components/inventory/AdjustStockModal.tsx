import { useState, type FormEvent } from "react";
import { useAuth } from "../../contexts/AuthContext";
import { useToast } from "../../contexts/ToastContext";
import { Modal } from "../ui/Modal";
import { Button } from "../ui/Button";
import { Input } from "../ui/Input";
import { Select } from "../ui/Select";
import { Textarea } from "../ui/Textarea";
import { ProductSelect } from "./ProductSelect";
import { callAdjustStock, fetchActiveProductsLite, type ProductLite } from "../../lib/api";
import { ADJUST_REASONS, unitShort } from "../../lib/constants";
import { fmtQty } from "../../lib/format";
import type { MovementType } from "../../lib/types";
import { t } from "../../i18n";

interface AdjustStockModalProps {
  open: boolean;
  onClose: () => void;
  presetProductId?: string | null;
  onSaved?: () => void;
}

export function AdjustStockModal({
  open,
  onClose,
  presetProductId,
  onSaved,
}: AdjustStockModalProps) {
  const { store } = useAuth();
  const { showToast } = useToast();
  const [productId, setProductId] = useState<string | null>(null);
  const [reason, setReason] = useState("");
  const [quantity, setQuantity] = useState("");
  const [note, setNote] = useState("");
  const [productInfo, setProductInfo] = useState<ProductLite | null>(null);
  const [errors, setErrors] = useState<{ reason?: string; quantity?: string }>({});
  const [saving, setSaving] = useState(false);

  const effectiveProductId = presetProductId ?? productId;
  const isRemoval = reason === "damage" || reason === "theft";
  const isCorrection = reason === "correction";

  const loadSelectedInfo = async (id: string) => {
    if (!store) return;
    try {
      const products = await fetchActiveProductsLite(store.id);
      setProductInfo(products.find((p) => p.id === id) ?? null);
    } catch {
      setProductInfo(null);
    }
  };

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    if (!store || !effectiveProductId) return;
    const nextErrors: typeof errors = {};
    if (!reason) nextErrors.reason = "Le motif est obligatoire";
    const qty = Number(quantity.replace(",", "."));
    if (Number.isNaN(qty)) {
      nextErrors.quantity = "Quantité invalide";
    } else if (isRemoval && qty <= 0) {
      nextErrors.quantity = "Entrez une quantité supérieure à 0";
    } else if (isCorrection && qty === 0) {
      nextErrors.quantity = "La correction ne peut pas être nulle";
    } else if (
      reason === "count_adjustment" &&
      productInfo &&
      qty === Number(productInfo.current_stock)
    ) {
      nextErrors.quantity = "Aucun changement de stock";
    }
    setErrors(nextErrors);
    if (Object.keys(nextErrors).length > 0) return;

    setSaving(true);
    try {
      await callAdjustStock({
        productId: effectiveProductId,
        movementType: reason as MovementType,
        quantity: qty,
        note: note.trim() || null,
      });
      showToast(t("toast.stockUpdated"));
      setQuantity("");
      setNote("");
      onSaved?.();
      onClose();
    } catch (err) {
      showToast(err instanceof Error ? err.message : t("common.error"), "error");
    } finally {
      setSaving(false);
    }
  };

  if (!store) return null;

  return (
    <Modal open={open} onClose={onClose} title="Ajuster le stock">
      <form onSubmit={handleSubmit} className="space-y-4 pb-3">
        <ProductSelect
          storeId={store.id}
          value={effectiveProductId}
          onChange={(id) => {
            setProductId(id);
            setQuantity("");
            setProductInfo(null);
            if (id) loadSelectedInfo(id);
          }}
          label={t("inventory.adjust.product")}
        />
        {productInfo && !isRemoval && (
          <p className="-mt-2 text-xs text-neutral-500">
            Stock actuel :{" "}
            <span className="font-semibold tnum">
              {fmtQty(productInfo.current_stock)} {unitShort(productInfo.unit)}
            </span>
          </p>
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
              {r.label}
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
            suffix={productInfo ? unitShort(productInfo.unit) : undefined}
            hint={
              !isRemoval && productInfo
                ? t("inventory.adjust.newQtyHint", {
                    qty: `${fmtQty(productInfo.current_stock)} ${unitShort(productInfo.unit)}`,
                  })
                : undefined
            }
            value={quantity}
            error={errors.quantity}
            onChange={(e) => setQuantity(e.target.value)}
          />
        )}
        <Textarea
          label={`${t("common.notes")} (${t("common.optional")})`}
          rows={2}
          value={note}
          onChange={(e) => setNote(e.target.value)}
        />
        <div className="flex justify-end gap-3">
          <Button variant="secondary" onClick={onClose} disabled={saving}>
            {t("common.cancel")}
          </Button>
          <Button type="submit" loading={saving}>
            {t("common.save")}
          </Button>
        </div>
      </form>
    </Modal>
  );
}
