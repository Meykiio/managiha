import { useEffect, useState } from "react";
import { Archive, ArchiveRestore, Pencil } from "lucide-react";
import { supabase } from "../../lib/supabaseClient";
import { useAuth } from "../../contexts/AuthContext";
import { useToast } from "../../contexts/ToastContext";
import { Modal } from "../ui/Modal";
import { Button } from "../ui/Button";
import { Badge } from "../ui/Badge";
import { EmptyState } from "../ui/EmptyState";
import { fetchCategories } from "../../lib/api";
import type { Category } from "../../lib/types";
import { t } from "../../i18n";

interface CategoryManageModalProps {
  open: boolean;
  onClose: () => void;
  onChanged: () => void;
}

export function CategoryManageModal({ open, onClose, onChanged }: CategoryManageModalProps) {
  const { store } = useAuth();
  const { showToast } = useToast();
  const [categories, setCategories] = useState<Category[]>([]);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [draftName, setDraftName] = useState("");
  const [busyId, setBusyId] = useState<string | null>(null);

  useEffect(() => {
    if (!open || !store) return;
    fetchCategories(store.id)
      .then(setCategories)
      .catch(() => setCategories([]));
  }, [open, store]);

  if (!store) return null;

  const rename = async (category: Category) => {
    const name = draftName.trim();
    setEditingId(null);
    if (!name || name === category.name) return;
    setBusyId(category.id);
    try {
      const res = await supabase
        .from("categories")
        .update({ name })
        .eq("id", category.id);
      if (res.error) throw new Error(res.error.message);
      showToast(t("toast.categoryUpdated"));
      setCategories(await fetchCategories(store.id));
      onChanged();
    } catch (err) {
      showToast(err instanceof Error ? err.message : t("common.error"), "error");
    } finally {
      setBusyId(null);
    }
  };

  const toggleArchive = async (category: Category) => {
    setBusyId(category.id);
    try {
      const archived_at = category.archived_at ? null : new Date().toISOString();
      const res = await supabase.from("categories").update({ archived_at }).eq("id", category.id);
      if (res.error) throw new Error(res.error.message);
      showToast(t("toast.categoryUpdated"));
      setCategories(await fetchCategories(store.id));
      onChanged();
    } catch (err) {
      showToast(err instanceof Error ? err.message : t("common.error"), "error");
    } finally {
      setBusyId(null);
    }
  };

  const archived = categories.filter((c) => c.archived_at);

  return (
    <Modal open={open} onClose={onClose} title={t("categoryManage.title")}>
      {categories.length === 0 ? (
        <EmptyState compact icon={Pencil} title={t("categoryManage.none")} body="" />
      ) : (
        <>
          <ul className="divide-y divide-neutral-100">
            {categories
              .filter((c) => !c.archived_at)
              .map((c) => (
                <li key={c.id} className="flex items-center gap-2 py-2.5">
                  {editingId === c.id ? (
                    <input
                      autoFocus
                      value={draftName}
                      onChange={(e) => setDraftName(e.target.value)}
                      onBlur={() => rename(c)}
                      onKeyDown={(e) => {
                        if (e.key === "Enter") rename(c);
                        if (e.key === "Escape") setEditingId(null);
                      }}
                      className="h-11 flex-1 rounded-lg border border-primary-500 px-3 text-sm focus:outline-none focus:ring-2 focus:ring-primary-100"
                    />
                  ) : (
                    <span className="flex-1 truncate text-sm font-medium text-neutral-900">
                      {c.name}
                    </span>
                  )}
                  <Button
                    variant="ghost"
                    size="icon"
                    title={t("common.edit")}
                    disabled={busyId === c.id || editingId === c.id}
                    onClick={() => {
                      setEditingId(c.id);
                      setDraftName(c.name);
                    }}
                  >
                    <Pencil className="h-[18px] w-[18px]" />
                  </Button>
                  <Button
                    variant="ghost"
                    size="icon"
                    title={t("common.archive")}
                    className="text-red-500 hover:bg-red-50"
                    disabled={busyId === c.id}
                    onClick={() => toggleArchive(c)}
                  >
                    <Archive className="h-[18px] w-[18px]" />
                  </Button>
                </li>
              ))}
          </ul>
          {archived.length > 0 && (
            <div className="mt-3 border-t border-neutral-100 pt-3">
              <ul className="space-y-2">
                {archived.map((c) => (
                  <li key={c.id} className="flex items-center gap-2">
                    <span className="flex-1 truncate text-sm text-neutral-500 line-through">
                      {c.name}
                    </span>
                    <Badge tone="neutral">{t("common.archived")}</Badge>
                    <Button
                      variant="ghost"
                      size="icon"
                      title={t("common.restore")}
                      disabled={busyId === c.id}
                      onClick={() => toggleArchive(c)}
                    >
                      <ArchiveRestore className="h-[18px] w-[18px]" />
                    </Button>
                  </li>
                ))}
              </ul>
            </div>
          )}
        </>
      )}
    </Modal>
  );
}