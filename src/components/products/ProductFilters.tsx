import { Search } from "lucide-react";
import { Input } from "../ui/Input";
import { Select } from "../ui/Select";
import { Chip, ChipGroup } from "../ui/Chip";
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

/**
 * Search and category and supplier stay selects, because each is an open set that
 * grows with the shop. Status and archive state become chips, because each is a
 * short closed set: showing all four options at once costs one glance and one
 * click, where a dropdown costs two clicks and hides the alternatives.
 *
 * The chips are also 44px tall against the 36px the select renders at, which
 * matters on the phone this will actually be used on.
 */
export function ProductFilters({ categories, suppliers, value, onChange }: ProductFiltersProps) {
  // Inside the component, so it re-evaluates on a language switch. At module
  // scope these strings would freeze at import.
  const statusLabels: Record<Exclude<StockStatus, never>, string> = {
    healthy: t("products.status.healthy"),
    low: t("products.status.low"),
    out: t("products.status.out"),
  };

  const set = (patch: Partial<ProductFilterState>) => onChange({ ...value, ...patch });
  const isArchived = value.archiveState === "archived";

  return (
    <div className="space-y-3">
      <div className="grid gap-3 sm:grid-cols-3">
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
      </div>

      <ChipGroup label={t("products.filter.archiveState")}>
        <Chip
          selected={!isArchived}
          onClick={() => set({ archiveState: "active" })}
        >
          {t("products.filter.active")}
        </Chip>
        <Chip selected={isArchived} onClick={() => set({ archiveState: "archived" })}>
          {t("products.filter.archivedList")}
        </Chip>
      </ChipGroup>

      <ChipGroup label={t("products.filter.status")}>
        <Chip
          selected={value.status === ""}
          // Stock status only exists for active products, so selecting "all" here
          // while viewing the archive would be a filter that silently does nothing.
          onClick={() => set({ status: "" })}
        >
          {t("common.all")}
        </Chip>
        {(["healthy", "low", "out"] as const).map((status) => (
          <Chip
            key={status}
            selected={value.status === status}
            onClick={() => set({ status: value.status === status ? "" : status })}
          >
            {statusLabels[status]}
          </Chip>
        ))}
      </ChipGroup>

      {isArchived && value.status !== "" && (
        <p className="text-xs text-body-muted">{t("products.filter.statusIgnored")}</p>
      )}
    </div>
  );
}
