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
import type { Product, Unit } from "../../lib/types";
import { t } from "../../i18n";

interface ProductFormModalProps {
  open: boolean;
  onClose: () => void;
  product?: Product | null;
  onSaved?: (productId?: string) => void;
}

function toFormValues(product: Product | null | undefined): ProductFormValues {
  if (!product) return emptyProductForm;
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

export function ProductFormModal({ open, onClose, product, onSaved }: ProductFormModalProps) {
  const { store } = useAuth();
  const { showToast } = useToast();
  const [values, setValues] = useState<ProductFormValues>(emptyProductForm);
  const [errors, setErrors] = useState<Partial<Record<keyof ProductFormValues, string>>>({});
  const [saving, setSaving] = useState(false);
  const isEdit = !!product;

  useEffect(() => {
    if (open) {
      setValues(toFormValues(product));
      setErrors({});
    }
  }, [open, product]);

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

      let productId: string;
      if (isEdit && product) {
        const res = await supabase
          .from("products")
          .update(payload)
          .eq("id", product.id)
          .select("id")
          .single();
        if (res.error) throw new Error(res.error.message);
        productId = res.data.id;
        showToast(t("toast.productUpdated"));
      } else {
        const res = await supabase
          .from("products")
          .insert({ ...payload, current_stock: 0 })
          .select("id")
          .single();
        if (res.error) throw new Error(res.error.message);
        productId = res.data.id;
        showToast(t("toast.productAdded"));

        const initialStock =
          values.currentStock === "" ? 0 : Number(values.currentStock.replace(",", "."));
        if (initialStock > 0) {
          await callAdjustStock({
            productId,
            movementType: "opening_balance",
            quantity: initialStock,
            unitCost: payload.cost_price || null,
          });
        }
      }
      onSaved?.(productId);
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
