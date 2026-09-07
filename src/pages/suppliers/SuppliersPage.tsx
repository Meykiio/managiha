import { useCallback, useEffect, useState } from "react";
import { Archive, ArchiveRestore, Pencil, Phone, Plus, Search, Truck } from "lucide-react";
import { supabase } from "../../lib/supabaseClient";
import { useAuth } from "../../contexts/AuthContext";
import { useToast } from "../../contexts/ToastContext";
import { Button } from "../../components/ui/Button";
import { Card } from "../../components/ui/Card";
import { EmptyState } from "../../components/ui/EmptyState";
import { PageHeader } from "../../components/ui/PageHeader";
import { Badge } from "../../components/ui/Badge";
import { ConfirmDialog } from "../../components/ui/ConfirmDialog";
import { Input } from "../../components/ui/Input";
import { SupplierFormModal } from "../../components/suppliers/SupplierFormModal";
import { useDebounced } from "../../hooks/useDebounced";
import type { Supplier } from "../../lib/types";
import { waLink, fmtQty } from "../../lib/format";
import { t } from "../../i18n";

type SupplierRow = Supplier & { product_count: number };

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
        <label className="flex h-11 cursor-pointer items-center gap-2.5 text-sm text-neutral-600">
          <input
            type="checkbox"
            checked={showArchived}
            onChange={(e) => setShowArchived(e.target.checked)}
            className="h-4 w-4 rounded border-neutral-300 text-primary-600 focus:ring-primary-500"
          />
          {t("common.showArchived")}
        </label>
      </div>

      <Card bodyClassName={loading ? "" : "px-0 pb-0"}>
        {loading ? (
          <div className="space-y-3 p-5">
            {Array.from({ length: 5 }).map((_, i) => (
              <div key={i} className="h-10 animate-pulse rounded-lg bg-neutral-100" />
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
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-neutral-200 bg-neutral-50 text-xs font-semibold uppercase tracking-wide text-neutral-500">
                  <th className="px-5 py-3 text-start">{t("suppliers.table.name")}</th>
                  <th className="px-3 py-3 text-start">{t("suppliers.table.contact")}</th>
                  <th className="px-3 py-3 text-start hidden md:table-cell">{t("suppliers.table.address")}</th>
                  <th className="px-3 py-3 text-start">{t("suppliers.table.products")}</th>
                  <th className="px-5 py-3 text-end">{t("common.actions")}</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-neutral-100">
                {rows.map((s) => (
                  <tr key={s.id} className="hover:bg-neutral-50/60">
                    <td className="px-5 py-3.5">
                      <span className="font-medium text-neutral-900">{s.name}</span>
                      {s.notes && (
                        <span className="block max-w-[16rem] truncate text-xs text-neutral-400">
                          {s.notes}
                        </span>
                      )}
                    </td>
                    <td className="px-3 py-3.5">
                      {s.phone && (
                        <a
                          href={`tel:${s.phone}`}
                          className="tnum flex items-center gap-1.5 text-neutral-700 hover:text-primary-700"
                        >
                          <Phone className="h-3.5 w-3.5" />
                          {s.phone}
                        </a>
                      )}
                      {s.whatsapp && waLink(s.whatsapp, "") && (
                        <a
                          href={waLink(s.whatsapp, "")!}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="mt-0.5 block text-xs font-medium text-emerald-600 hover:text-emerald-700"
                        >
                          {t("suppliers.whatsapp")}
                        </a>
                      )}
                      {!s.phone && !s.whatsapp && "—"}
                    </td>
                    <td className="hidden max-w-[14rem] truncate px-3 py-3.5 text-neutral-500 md:table-cell">
                      {s.address ?? "—"}
                    </td>
                    <td className="tnum px-3 py-3.5 text-neutral-600">
                      {t("suppliers.productsCount", { count: fmtQty(s.product_count) })}
                    </td>
                    <td className="px-5 py-3.5">
                      <div className="flex items-center justify-end gap-1">
                        {showArchived && <Badge tone="neutral">{t("common.archived")}</Badge>}
                        <Button variant="ghost" size="icon" title={t("common.edit")} onClick={() => openEdit(s)}>
                          <Pencil className="h-[18px] w-[18px]" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          title={s.archived_at ? t("common.restore") : t("common.archive")}
                          className="text-red-500 hover:bg-red-50"
                          onClick={() => setArchiveTarget(s)}
                        >
                          {s.archived_at ? (
                            <ArchiveRestore className="h-[18px] w-[18px]" />
                          ) : (
                            <Archive className="h-[18px] w-[18px]" />
                          )}
                        </Button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
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
