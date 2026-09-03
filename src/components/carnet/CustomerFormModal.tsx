import { useEffect, useState, type FormEvent } from "react";
import { useAuth } from "../../contexts/AuthContext";
import { useToast } from "../../contexts/ToastContext";
import { Modal } from "../ui/Modal";
import { Button } from "../ui/Button";
import { Input } from "../ui/Input";
import { Textarea } from "../ui/Textarea";
import { supabase } from "../../lib/supabaseClient";
import type { CarnetCustomer } from "../../lib/types";
import { t } from "../../i18n";

interface CustomerFormModalProps {
  open: boolean;
  onClose: () => void;
  customer?: CarnetCustomer | null;
  onSaved?: () => void;
}

export function CustomerFormModal({ open, onClose, customer, onSaved }: CustomerFormModalProps) {
  const { store } = useAuth();
  const { showToast } = useToast();
  const isEdit = !!customer;
  const [fullName, setFullName] = useState("");
  const [phone, setPhone] = useState("");
  const [notes, setNotes] = useState("");
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (open) {
      setFullName(customer?.full_name ?? "");
      setPhone(customer?.phone ?? "");
      setNotes(customer?.notes ?? "");
      setError("");
    }
  }, [open, customer]);

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    if (!store) return;
    if (!fullName.trim()) {
      setError(t("validation.nameRequired"));
      return;
    }
    setSaving(true);
    try {
      let res;
      if (isEdit && customer) {
        res = await supabase
          .from("carnet_customers")
          .update({
            full_name: fullName.trim(),
            phone: phone.trim() || null,
            notes: notes.trim() || null,
          })
          .eq("id", customer.id);
      } else {
        res = await supabase.from("carnet_customers").insert({
          store_id: store.id,
          full_name: fullName.trim(),
          phone: phone.trim() || null,
          notes: notes.trim() || null,
        });
      }
      if (res.error) throw new Error(res.error.message);
      showToast(isEdit ? t("toast.customerUpdated") : t("toast.customerAdded"));
      onSaved?.();
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : t("common.error"));
    } finally {
      setSaving(false);
    }
  };

  return (
    <Modal open={open} onClose={onClose} title={isEdit ? t("customerForm.titleEdit") : t("customerForm.titleNew")}>
      <form onSubmit={handleSubmit} className="space-y-4 pb-3">
        <Input
          label={t("customerForm.name")}
          required
          autoFocus
          value={fullName}
          error={error}
          onChange={(e) => setFullName(e.target.value)}
        />
        <Input
          label={t("customerForm.phone")}
          type="tel"
          inputMode="tel"
          value={phone}
          onChange={(e) => setPhone(e.target.value)}
        />
        <Textarea
          label={`${t("customerForm.notes")} (${t("common.optional")})`}
          rows={2}
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
        />
        <div className="flex justify-end gap-3">
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
