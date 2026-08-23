import { useEffect, useState, type FormEvent } from "react";
import { supabase } from "../../lib/supabaseClient";
import { useAuth } from "../../contexts/AuthContext";
import { useToast } from "../../contexts/ToastContext";
import { Button } from "../ui/Button";
import { Input } from "../ui/Input";
import { Modal } from "../ui/Modal";
import { Textarea } from "../ui/Textarea";
import type { Supplier } from "../../lib/types";
import { t } from "../../i18n";

interface FormState {
  name: string;
  phone: string;
  whatsapp: string;
  address: string;
  notes: string;
}

const emptyForm: FormState = { name: "", phone: "", whatsapp: "", address: "", notes: "" };

interface SupplierFormModalProps {
  open: boolean;
  onClose: () => void;
  editing?: Supplier | null;
  onSaved?: () => void;
}

export function SupplierFormModal({ open, onClose, editing, onSaved }: SupplierFormModalProps) {
  const { store } = useAuth();
  const { showToast } = useToast();
  const [form, setForm] = useState<FormState>(emptyForm);
  const [formError, setFormError] = useState("");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (open) {
      setForm(
        editing
          ? {
              name: editing.name,
              phone: editing.phone ?? "",
              whatsapp: editing.whatsapp ?? "",
              address: editing.address ?? "",
              notes: editing.notes ?? "",
            }
          : emptyForm
      );
      setFormError("");
    }
  }, [open, editing]);

  const handleSave = async (e: FormEvent) => {
    e.preventDefault();
    if (!store) return;
    if (!form.name.trim()) {
      setFormError("Le nom est obligatoire");
      return;
    }
    setSaving(true);
    try {
      const payload = {
        store_id: store.id,
        name: form.name.trim(),
        phone: form.phone.trim() || null,
        whatsapp: form.whatsapp.trim() || null,
        address: form.address.trim() || null,
        notes: form.notes.trim() || null,
      };
      const res = editing
        ? await supabase.from("suppliers").update(payload).eq("id", editing.id)
        : await supabase.from("suppliers").insert(payload);
      if (res.error) throw new Error(res.error.message);
      showToast(editing ? t("toast.supplierUpdated") : t("toast.supplierAdded"));
      onSaved?.();
      onClose();
    } catch (err) {
      setFormError(err instanceof Error ? err.message : t("common.error"));
    } finally {
      setSaving(false);
    }
  };

  return (
    <Modal
      open={open}
      onClose={onClose}
      title={editing ? t("common.edit") : t("suppliers.add")}
      footer={
        <>
          <Button variant="secondary" onClick={onClose} disabled={saving}>
            {t("common.cancel")}
          </Button>
          <Button type="submit" form="supplier-form" loading={saving}>
            {t("common.save")}
          </Button>
        </>
      }
    >
      <form id="supplier-form" onSubmit={handleSave} className="space-y-4 pb-1">
        <Input
          label={t("suppliers.form.name")}
          required
          autoFocus
          value={form.name}
          error={formError}
          onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
        />
        <div className="grid gap-4 sm:grid-cols-2">
          <Input
            label={t("suppliers.form.phone")}
            type="tel"
            value={form.phone}
            onChange={(e) => setForm((f) => ({ ...f, phone: e.target.value }))}
          />
          <Input
            label={t("suppliers.form.whatsapp")}
            type="tel"
            value={form.whatsapp}
            onChange={(e) => setForm((f) => ({ ...f, whatsapp: e.target.value }))}
          />
        </div>
        <Input
          label={`${t("suppliers.form.address")} (${t("common.optional")})`}
          value={form.address}
          onChange={(e) => setForm((f) => ({ ...f, address: e.target.value }))}
        />
        <Textarea
          label={`${t("suppliers.form.notes")} (${t("common.optional")})`}
          rows={2}
          value={form.notes}
          onChange={(e) => setForm((f) => ({ ...f, notes: e.target.value }))}
        />
      </form>
    </Modal>
  );
}
