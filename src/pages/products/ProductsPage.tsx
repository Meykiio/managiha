import { useCallback, useEffect, useMemo, useState } from "react";
import { Package, Plus, Search } from "lucide-react";
import { supabase } from "../../lib/supabaseClient";
import { useAuth } from "../../contexts/AuthContext";
import { useToast } from "../../contexts/ToastContext";
import { useDebounced } from "../../hooks/useDebounced";
import { Button } from "../../components/ui/Button";
import { Card } from "../../components/ui/Card";
import { EmptyState } from "../../components/ui/EmptyState";
import { PageHeader } from "../../components/ui/PageHeader";
import { Pagination } from "../../components/ui/Pagination";
import { ConfirmDialog } from "../../components/ui/ConfirmDialog";
import { ProductFormModal } from "../../components/products/ProductFormModal";
import { ProductFilters, type ProductFilterState } from "../../components/products/ProductFilters";
import { ProductsTable } from "../../components/products/ProductsTable";
import { AdjustStockModal } from "../../components/inventory/AdjustStockModal";
import { fetchCategories, fetchSuppliers } from "../../lib/api";
import type { Category, ProductOverview, Supplier } from "../../lib/types";
import { PAGE_SIZE } from "../../lib/constants";
import { t } from "../../i18n";

export default function ProductsPage() {
  const { store } = useAuth();
  const { showToast } = useToast();

  const [filters, setFilters] = useState<ProductFilterState>({
    search: "",
    category: "",
    supplier: "",
    status: "",
    archiveState: "active",
  });
  const debouncedSearch = useDebounced(filters.search);

  const [categories, setCategories] = useState<Category[]>([]);
  const [suppliers, setSuppliers] = useState<Supplier[]>([]);
  const [rows, setRows] = useState<ProductOverview[]>([]);
  const [count, setCount] = useState(0);
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(true);

  const [addOpen, setAddOpen] = useState(false);
  const [editProduct, setEditProduct] = useState<ProductOverview | null>(null);
  const [adjustFor, setAdjustFor] = useState<string | null>(null);
  const [archiveTarget, setArchiveTarget] = useState<ProductOverview | null>(null);
  const [archiving, setArchiving] = useState(false);

  useEffect(() => {
    if (!store) return;
    fetchCategories(store.id).then(setCategories).catch(() => {});
    fetchSuppliers(store.id, true).then(setSuppliers).catch(() => {});
  }, [store]);

  useEffect(() => {
    setPage(1);
  }, [debouncedSearch, filters.category, filters.status, filters.supplier, filters.archiveState]);

  const loadRows = useCallback(async () => {
    if (!store) return;
    setLoading(true);
    try {
      let query = supabase
        .from("products_overview")
        .select("*", { count: "exact" })
        .eq("store_id", store.id);
      if (debouncedSearch.trim()) {
        const q = debouncedSearch.trim().replace(/[%,()]/g, "");
        query = query.or(`name.ilike.%${q}%,sku.ilike.%${q}%,barcode.ilike.%${q}%`);
      }
      if (filters.category) query = query.eq("category_id", filters.category);
      if (filters.supplier) query = query.eq("supplier_id", filters.supplier);
      if (filters.archiveState === "active") {
        query = query.eq("active", true).is("archived_at", null);
        if (filters.status) query = query.eq("stock_status", filters.status);
      } else {
        query = query.not("archived_at", "is", null);
      }
      const from = (page - 1) * PAGE_SIZE;
      const { data, error, count: total } = await query
        .order("name", { ascending: true })
        .range(from, from + PAGE_SIZE - 1);
      if (error) throw error;
      setRows((data ?? []) as unknown as ProductOverview[]);
      setCount(total ?? 0);
    } catch (err) {
      showToast(err instanceof Error ? err.message : t("common.error"), "error");
    } finally {
      setLoading(false);
    }
  }, [
    store,
    debouncedSearch,
    filters.category,
    filters.status,
    filters.supplier,
    filters.archiveState,
    page,
    showToast,
  ]);

  useEffect(() => {
    loadRows();
  }, [loadRows]);

  const totalPages = Math.max(1, Math.ceil(count / PAGE_SIZE));
  const archiveLabel = useMemo(
    () => (archiveTarget?.archived_at ? t("common.restore") : t("common.archive")),
    [archiveTarget]
  );

  const handleArchiveToggle = async () => {
    if (!archiveTarget) return;
    setArchiving(true);
    try {
      const archived_at = archiveTarget.archived_at ? null : new Date().toISOString();
      const res = await supabase.from("products").update({ archived_at }).eq("id", archiveTarget.id);
      if (res.error) throw new Error(res.error.message);
      showToast(archived_at ? t("toast.productArchived") : t("toast.productRestored"));
      setArchiveTarget(null);
      loadRows();
    } catch (err) {
      showToast(err instanceof Error ? err.message : t("common.error"), "error");
    } finally {
      setArchiving(false);
    }
  };

  const noFilters =
    !debouncedSearch &&
    !filters.category &&
    !filters.status &&
    !filters.supplier &&
    filters.archiveState === "active";

  return (
    <div className="space-y-5">
      <PageHeader
        title={t("products.title")}
        description={t("products.subtitle")}
        actions={
          <Button onClick={() => setAddOpen(true)}>
            <Plus className="h-4 w-4" />
            {t("products.add")}
          </Button>
        }
      />

      <ProductFilters categories={categories} suppliers={suppliers} value={filters} onChange={setFilters} />

      <Card bodyClassName={loading ? "" : "px-0 pb-0"}>
        {loading ? (
          <div className="space-y-3 py-6">
            {Array.from({ length: 6 }).map((_, i) => (
              <div key={i} className="mx-5 h-10 animate-pulse rounded-lg bg-neutral-100" />
            ))}
          </div>
        ) : rows.length === 0 ? (
          noFilters ? (
            <EmptyState
              icon={Package}
              title={t("products.empty.title")}
              body={t("products.empty.body")}
              action={
                <Button onClick={() => setAddOpen(true)}>
                  <Plus className="h-4 w-4" />
                  {t("products.add")}
                </Button>
              }
            />
          ) : (
            <EmptyState
              icon={Search}
              title={t("products.emptyFiltered.title")}
              body={t("products.emptyFiltered.body")}
            />
          )
        ) : (
          <>
            <ProductsTable
              rows={rows}
              categories={categories}
              showArchivedList={filters.archiveState === "archived"}
              archiveLabel={archiveLabel}
              onEdit={setEditProduct}
              onAdjust={setAdjustFor}
              onArchiveToggle={setArchiveTarget}
            />
            <div className="px-5 pb-4 pt-1">
              <Pagination page={page} totalPages={totalPages} onChange={setPage} />
            </div>
          </>
        )}
      </Card>

      <ProductFormModal open={addOpen} onClose={() => setAddOpen(false)} onSaved={() => loadRows()} />
      <ProductFormModal
        open={!!editProduct}
        onClose={() => setEditProduct(null)}
        product={editProduct}
        onSaved={() => loadRows()}
      />
      <AdjustStockModal
        open={!!adjustFor}
        onClose={() => setAdjustFor(null)}
        presetProductId={adjustFor}
        onSaved={() => loadRows()}
      />
      <ConfirmDialog
        open={!!archiveTarget}
        loading={archiving}
        title={archiveTarget?.archived_at ? t("common.restore") : t("products.archiveConfirm.title")}
        body={
          archiveTarget?.archived_at
            ? `${archiveTarget?.name} réapparaîtra dans le catalogue actif.`
            : t("products.archiveConfirm.body")
        }
        confirmLabel={archiveTarget?.archived_at ? t("common.restore") : undefined}
        onConfirm={handleArchiveToggle}
        onCancel={() => setArchiveTarget(null)}
      />
    </div>
  );
}
