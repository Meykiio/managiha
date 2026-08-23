import { useEffect, useState } from "react";
import { Input } from "../ui/Input";
import { Select } from "../ui/Select";
import { CategoryCombo } from "./CategoryCombo";
import { fetchSuppliers } from "../../lib/api";
import { UNITS } from "../../lib/constants";
import type { Supplier, Unit } from "../../lib/types";
import { t } from "../../i18n";

export interface ProductFormValues {
  name: string;
  categoryId: string | null;
  unit: Unit;
  costPrice: string;
  sellPrice: string;
  currentStock: string;
  threshold: string;
  barcode: string;
  sku: string;
  expiryDate: string;
  supplierId: string;
}

export const emptyProductForm: ProductFormValues = {
  name: "",
  categoryId: null,
  unit: "piece",
  costPrice: "",
  sellPrice: "",
  currentStock: "",
  threshold: "",
  barcode: "",
  sku: "",
  expiryDate: "",
  supplierId: "",
};

interface ProductFormFieldsProps {
  storeId: string;
  values: ProductFormValues;
  onChange: (values: ProductFormValues) => void;
  errors: Partial<Record<keyof ProductFormValues, string>>;
  isEdit?: boolean;
}

export function ProductFormFields({
  storeId,
  values,
  onChange,
  errors,
  isEdit,
}: ProductFormFieldsProps) {
  const [suppliers, setSuppliers] = useState<Supplier[]>([]);

  useEffect(() => {
    fetchSuppliers(storeId)
      .then(setSuppliers)
      .catch(() => setSuppliers([]));
  }, [storeId]);

  const set = <K extends keyof ProductFormValues>(key: K, v: ProductFormValues[K]) =>
    onChange({ ...values, [key]: v });

  return (
    <div className="space-y-5">
      <Input
        label={t("productForm.name")}
        required
        autoFocus
        placeholder={t("productForm.namePlaceholder")}
        value={values.name}
        error={errors.name}
        onChange={(e) => set("name", e.target.value)}
      />
      <CategoryCombo
        storeId={storeId}
        value={values.categoryId}
        onChange={(id) => set("categoryId", id)}
      />
      <div className="grid gap-4 sm:grid-cols-2">
        <Select
          label={t("productForm.unit")}
          value={values.unit}
          onChange={(e) => set("unit", e.target.value as Unit)}
        >
          {UNITS.map((u) => (
            <option key={u.value} value={u.value}>
              {u.label}
            </option>
          ))}
        </Select>
        <Input
          label={`${t("productForm.threshold")} (${t("common.optional")})`}
          type="number"
          inputMode="decimal"
          step="any"
          min="0"
          value={values.threshold}
          onChange={(e) => set("threshold", e.target.value)}
        />
      </div>
      <div className="grid gap-4 sm:grid-cols-2">
        <Input
          label={t("productForm.costPrice")}
          type="number"
          inputMode="decimal"
          step="any"
          min="0"
          suffix="DZD"
          value={values.costPrice}
          error={errors.costPrice}
          onChange={(e) => set("costPrice", e.target.value)}
        />
        <Input
          label={t("productForm.sellPrice")}
          type="number"
          inputMode="decimal"
          step="any"
          min="0"
          suffix="DZD"
          value={values.sellPrice}
          error={errors.sellPrice}
          onChange={(e) => set("sellPrice", e.target.value)}
        />
      </div>
      {!isEdit && (
        <Input
          label={`${t("productForm.currentStock")} (${t("common.optional")})`}
          type="number"
          inputMode="decimal"
          step="any"
          min="0"
          value={values.currentStock}
          hint={
            isEdit ? undefined : "Le stock initial sera enregistré comme mouvement « Stock initial »."
          }
          onChange={(e) => set("currentStock", e.target.value)}
        />
      )}
      {isEdit && (
        <p className="rounded-lg bg-neutral-50 px-3.5 py-2.5 text-xs text-neutral-500">
          {t("productForm.currentStockEditHint")}
        </p>
      )}
      <div className="grid gap-4 sm:grid-cols-2">
        <Input
          label={`${t("productForm.barcode")} (${t("common.optional")})`}
          placeholder={t("productForm.barcodePlaceholder")}
          inputMode="numeric"
          autoComplete="off"
          value={values.barcode}
          error={errors.barcode}
          onChange={(e) => set("barcode", e.target.value)}
        />
        <Input
          label={`${t("productForm.sku")} (${t("common.optional")})`}
          autoComplete="off"
          value={values.sku}
          error={errors.sku}
          onChange={(e) => set("sku", e.target.value)}
        />
      </div>
      <div className="grid gap-4 sm:grid-cols-2">
        <Input
          label={`${t("productForm.expiry")} (${t("common.optional")})`}
          type="date"
          value={values.expiryDate}
          onChange={(e) => set("expiryDate", e.target.value)}
        />
        <Select
          label={`${t("productForm.supplier")} (${t("common.optional")})`}
          value={values.supplierId}
          onChange={(e) => set("supplierId", e.target.value)}
        >
          <option value="">—</option>
          {suppliers.map((s) => (
            <option key={s.id} value={s.id}>
              {s.name}
            </option>
          ))}
        </Select>
      </div>
    </div>
  );
}

export function productFormErrors(
  values: ProductFormValues
): Partial<Record<keyof ProductFormValues, string>> {
  const errors: Partial<Record<keyof ProductFormValues, string>> = {};
  if (!values.name.trim()) errors.name = "Le nom est obligatoire";
  for (const key of ["costPrice", "sellPrice"] as const) {
    const raw = values[key];
    if (raw !== "" && (Number.isNaN(Number(raw)) || Number(raw) < 0)) {
      errors[key] = "Montant invalide";
    }
  }
  return errors;
}
