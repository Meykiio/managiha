import { useCallback, useEffect, useState } from "react";
import { Plus, Search, Truck } from "lucide-react";
import { supabase } from "../../lib/supabaseClient";
import { useAuth } from "../../contexts/AuthContext";
import { useToast } from "../../contexts/ToastContext";
import { Button } from "../../components/ui/Button";
import { Card } from "../../components/ui/Card";
import { EmptyState } from "../../components/ui/EmptyState";
import { PageHeader } from "../../components/ui/PageHeader";
import { ConfirmDialog } from "../../components/ui/ConfirmDialog";
import { Input } from "../../components/ui/Input";
import { SupplierFormModal } from "../../components/suppliers/SupplierFormModal";
import { SuppliersTable, type SupplierRow } from "../../components/suppliers/SuppliersTable";
import { useDebounced } from "../../hooks/useDebounced";
import type { Supplier } from "../../lib/types";
import { t } from "../../i18n";

export default function SuppliersPage() {
  const { store } = useAuth();
  const { showToast } = useToast();
  const [rows, setRows] = useState<SupplierRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [showArchived, setShowArchived] = useState(false);
  const [searchInput, setSearchInput] = useState("");
  const search = useDebounced(searchInput);
  const [formOpen, setFormOpen] = useState(false);
  const [editing, setEditing] = useState<Supplier | null>(null);
  const [archiveTarget, setArchiveTarget] = useState<Supplier | null>(null);
  const [archiving, setArchiving] = useState(false);

  const load = useCallback(async () => {
    if (!store) return;
    setLoading(true);
    try {
      let query = supabase
        .from("suppliers")
        .select("*, products(count)")
        .eq("store_id", store.id)
        .order("name")
        .limit(500);
      if (showArchived) {
        query = query.not("archived_at", "is", null);
      } else {
        query = query.is("archived_at", null);
      }
      if (search.trim()) {
        const q = search.trim().replace(/[%,()]/g, "");
        query = query.ilike("name", `%${q}%`);
      }
      const { data, error } = await query;
      if (error) throw new Error(error.message);
      const mapped = (
        (data ?? []) as unknown as (Supplier & { products: { count: number }[] })[]
      ).map((s) => ({ ...s, product_count: s.products?.[0]?.count ?? 0 }));
      setRows(mapped);
    } catch (err) {
      showToast(err instanceof Error ? err.message : t("common.error"), "error");
    } finally {
      setLoading(false);
    }
  }, [store, showArchived, search, showToast]);

  useEffect(() => {
    load();
  }, [load]);

  const openNew = () => {
    setEditing(null);
    setFormOpen(true);
  };

  const openEdit = (s: Supplier) => {
    setEditing(s);
    setFormOpen(true);
  };

  const handleArchiveToggle = async () => {
    if (!archiveTarget) return;
    setArchiving(true);
    try {
      const archived_at = archiveTarget.archived_at ? null : new Date().toISOString();
      const res = await supabase
        .from("suppliers")
        .update({ archived_at })
        .eq("id", archiveTarget.id);
      if (res.error) throw new Error(res.error.message);
      showToast(archived_at ? t("toast.supplierArchived") : t("toast.supplierRestored"));
      setArchiveTarget(null);
      load();
    } catch (err) {
      showToast(err instanceof Error ? err.message : t("common.error"), "error");
    } finally {
      setArchiving(false);
    }
  };

  return (
    <div className="space-y-5">
      <PageHeader
        title={t("suppliers.title")}
        description={t("suppliers.subtitle")}
        actions={
          <Button onClick={openNew}>
            <Plus className="h-4 w-4" />
            {t("suppliers.add")}
          </Button>
        }
      />

      <div className="flex flex-wrap items-center gap-4">
        <Input
          placeholder={t("common.search")}
          prefixIcon={<Search className="h-4 w-4" />}
          value={searchInput}
          onChange={(e) => setSearchInput(e.target.value)}
          aria-label={t("common.search")}
          className="max-w-sm"
        />
        <label className="flex h-11 cursor-pointer items-center gap-2.5 text-sm text-body-soft">
          <input
            type="checkbox"
            checked={showArchived}
            onChange={(e) => setShowArchived(e.target.checked)}
            className="h-4 w-4 rounded border-line-hi text-primary focus:ring-primary"
          />
          {t("common.showArchived")}
        </label>
      </div>

      <Card bodyClassName={loading ? "" : "px-0 pb-0"}>
        {loading ? (
          <div className="space-y-3 p-5">
            {Array.from({ length: 5 }).map((_, i) => (
              <div key={i} className="h-10 animate-pulse rounded-lg bg-surface-high" />
            ))}
          </div>
        ) : rows.length === 0 ? (
          <EmptyState
            icon={Truck}
            title={t("suppliers.empty.title")}
            body={t("suppliers.empty.body")}
            action={
              <Button onClick={openNew}>
                <Plus className="h-4 w-4" />
                {t("suppliers.add")}
              </Button>
            }
          />
        ) : (
          <SuppliersTable
            rows={rows}
            showArchived={showArchived}
            onEdit={openEdit}
            onArchiveToggle={setArchiveTarget}
          />
        )}
      </Card>

      <SupplierFormModal
        open={formOpen}
        onClose={() => setFormOpen(false)}
        editing={editing}
        onSaved={load}
      />

      <ConfirmDialog
        open={!!archiveTarget}
        loading={archiving}
        title={
          archiveTarget?.archived_at ? t("common.restore") : t("suppliers.archiveConfirm.title")
        }
        body={t("suppliers.archiveConfirm.body")}
        confirmLabel={archiveTarget?.archived_at ? t("common.restore") : undefined}
        onConfirm={handleArchiveToggle}
        onCancel={() => setArchiveTarget(null)}
      />
    </div>
  );
}
