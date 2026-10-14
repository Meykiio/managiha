import { useEffect, useState, type FormEvent } from "react";
import { useAuth } from "../../contexts/AuthContext";
import { useToast } from "../../contexts/ToastContext";
import { Modal } from "../ui/Modal";
import { Button } from "../ui/Button";
import {
  ProductFormFields,
  productFormErrors,
  emptyProductForm,
  type ProductFormValues,
} from "./ProductFormFields";
import { supabase } from "../../lib/supabaseClient";
import { callAdjustStock } from "../../lib/api";
import { newOperationId } from "../../lib/ids";
import { submitOrQueue } from "../../lib/offline/submit";
import type { Product, Unit } from "../../lib/types";
import { t } from "../../i18n";

interface ProductFormModalProps {
  open: boolean;
  onClose: () => void;
  product?: Product | null;
  /**
   * Prefills the barcode when creating. Used by the scanner, where the code is
   * already known and retyping it is the whole problem.
   */
  initialBarcode?: string;
  /**
   * Receives the saved row so a caller can act on it — the scanner adds the new
   * product straight to the cart, which is the only reason it opened the form.
   */
  onSaved?: (product?: Product) => void;
}

function toFormValues(
  product: Product | null | undefined,
  initialBarcode?: string
): ProductFormValues {
  if (!product) return { ...emptyProductForm, barcode: initialBarcode ?? "" };
  return {
    name: product.name,
    categoryId: product.category_id,
    unit: product.unit,
    costPrice: String(product.cost_price ?? ""),
    sellPrice: String(product.sell_price ?? ""),
    currentStock: "",
    threshold: product.low_stock_threshold != null ? String(product.low_stock_threshold) : "",
    barcode: product.barcode ?? "",
    sku: product.sku ?? "",
    expiryDate: product.expiry_date ?? "",
    supplierId: product.supplier_id ?? "",
    imagePath: product.image_path ?? null,
  };
}

export function ProductFormModal({
  open,
  onClose,
  product,
  initialBarcode,
  onSaved,
}: ProductFormModalProps) {
  const { store } = useAuth();
  const { showToast } = useToast();
  const [values, setValues] = useState<ProductFormValues>(emptyProductForm);
  const [errors, setErrors] = useState<Partial<Record<keyof ProductFormValues, string>>>({});
  const [saving, setSaving] = useState(false);
  const isEdit = !!product;

  useEffect(() => {
    if (open) {
      setValues(toFormValues(product, initialBarcode));
      setErrors({});
    }
  }, [open, product, initialBarcode]);

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    if (!store) return;
    const nextErrors = productFormErrors(values);
    if (Object.keys(nextErrors).length > 0) {
      setErrors(nextErrors);
      return;
    }
    setSaving(true);
    try {
      const payload = {
        store_id: store.id,
        name: values.name.trim(),
        category_id: values.categoryId,
        supplier_id: values.supplierId || null,
        unit: values.unit as Unit,
        cost_price: values.costPrice === "" ? 0 : Number(values.costPrice.replace(",", ".")),
        sell_price: values.sellPrice === "" ? 0 : Number(values.sellPrice.replace(",", ".")),
        low_stock_threshold:
          values.threshold === "" ? null : Number(values.threshold.replace(",", ".")),
        barcode: values.barcode.trim() || null,
        sku: values.sku.trim() || null,
        expiry_date: values.expiryDate || null,
        image_path: isEdit ? values.imagePath : null,
      };

      let saved: Product;
      if (isEdit && product) {
        const res = await supabase
          .from("products")
          .update(payload)
          .eq("id", product.id)
          .select("*")
          .single();
        if (res.error) throw new Error(res.error.message);
        saved = res.data as Product;
        showToast(t("toast.productUpdated"));
      } else {
        const res = await supabase
          .from("products")
          .insert({ ...payload, current_stock: 0 })
          .select("*")
          .single();
        if (res.error) throw new Error(res.error.message);
        const created = res.data as Product;
        saved = created;
        showToast(t("toast.productAdded"));

        const initialStock =
          values.currentStock === "" ? 0 : Number(values.currentStock.replace(",", "."));
        if (initialStock > 0) {
          const opId = newOperationId();
          const input = {
            productId: created.id,
            movementType: "opening_balance" as const,
            quantity: initialStock,
            unitCost: payload.cost_price || null,
            clientOpId: opId,
          };
          // The product row itself is already written at this point, so a queued
          // opening balance is not a lost product: it is a stock figure that will
          // catch up. The toast says which happened.
          await submitOrQueue("adjust_stock", opId, input, () => callAdjustStock(input));
        }
      }
      onSaved?.(saved);
      onClose();
    } catch (err) {
      showToast(err instanceof Error ? err.message : t("common.error"), "error");
    } finally {
      setSaving(false);
    }
  };

  if (!store) return null;

  return (
    <Modal open={open} onClose={onClose} title={isEdit ? t("common.edit") : t("products.add")} size="lg">
      <form onSubmit={handleSubmit} className="pb-3">
        <ProductFormFields
          storeId={store.id}
          productId={product?.id}
          values={values}
          onChange={setValues}
          errors={errors}
          isEdit={isEdit}
        />
        <div className="mt-6 flex justify-end gap-3">
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
