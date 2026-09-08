import { Search } from "lucide-react";
import { Input } from "../ui/Input";
import { Select } from "../ui/Select";
import type { Category, Supplier, StockStatus } from "../../lib/types";
import { t } from "../../i18n";

export interface ProductFilterState {
  search: string;
  category: string;
  supplier: string;
  status: string;
  archiveState: string;
}

interface ProductFiltersProps {
  categories: Category[];
  suppliers: Supplier[];
  value: ProductFilterState;
  onChange: (value: ProductFilterState) => void;
}

export function ProductFilters({ categories, suppliers, value, onChange }: ProductFiltersProps) {
  const STATUS_LABELS: Record<StockStatus, string> = {
    healthy: t("products.status.healthy"),
    low: t("products.status.low"),
    out: t("products.status.out"),
  };
  const set = (patch: Partial<ProductFilterState>) => onChange({ ...value, ...patch });

  return (
    <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
      <Input
        placeholder={t("productForm.barcodePlaceholder")}
        prefixIcon={<Search className="h-4 w-4" />}
        value={value.search}
        onChange={(e) => set({ search: e.target.value })}
        aria-label={t("common.search")}
      />
      <Select
        aria-label={t("products.filter.category")}
        value={value.category}
        onChange={(e) => set({ category: e.target.value })}
      >
        <option value="">{`${t("products.filter.category")} — ${t("common.all")}`}</option>
        {categories.map((c) => (
          <option key={c.id} value={c.id}>
            {c.name}
          </option>
        ))}
      </Select>
      <Select
        aria-label={t("products.filter.supplier")}
        value={value.supplier}
        onChange={(e) => set({ supplier: e.target.value })}
      >
        <option value="">{`${t("products.filter.supplier")} — ${t("common.all")}`}</option>
        {suppliers.map((s) => (
          <option key={s.id} value={s.id}>
            {s.name}
          </option>
        ))}
      </Select>
      <div className="grid grid-cols-2 gap-3">
        <Select
          aria-label={t("products.filter.status")}
          value={value.status}
          disabled={value.archiveState !== "active"}
          onChange={(e) => set({ status: e.target.value })}
        >
          <option value="">{`${t("products.filter.status")} — ${t("common.all")}`}</option>
          <option value="healthy">{STATUS_LABELS.healthy}</option>
          <option value="low">{STATUS_LABELS.low}</option>
          <option value="out">{STATUS_LABELS.out}</option>
        </Select>
        <Select
          aria-label={t("products.filter.archiveState")}
          value={value.archiveState}
          onChange={(e) => set({ archiveState: e.target.value })}
        >
          <option value="active">{t("products.filter.active")}</option>
          <option value="archived">{t("products.filter.archivedList")}</option>
        </Select>
      </div>
    </div>
  );
}
