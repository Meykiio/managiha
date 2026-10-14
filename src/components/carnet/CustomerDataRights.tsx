import { useState } from "react";
import { Download, ShieldCheck, UserX } from "lucide-react";
import { useToast } from "../../contexts/ToastContext";
import { Button } from "../ui/Button";
import { Card } from "../ui/Card";
import { ConfirmDialog } from "../ui/ConfirmDialog";
import { isAnonymised } from "./CustomerName";
import { supabase } from "../../lib/supabaseClient";
import type { CarnetCustomer } from "../../lib/types";
import { t } from "../../i18n";

interface CustomerDataRightsProps {
  customer: CarnetCustomer;
  onAnonymized: () => void;
}

/**
 * The two rights Loi 18-07 gives the person whose name is in this book: a copy of
 * what is held, and erasure.
 *
 * Both RPCs have existed since migration 00019 and were reachable from nowhere.
 * A right that requires a database console is not a right the shop can offer, and
 * the shop is the one legally on the hook for it.
 *
 * Erasure anonymises rather than deletes. The transactions are an accounting
 * record that has to survive, so the identity is stripped and the ledger stays —
 * and the erasure itself is logged, which is what makes it provable afterwards.
 */
export function CustomerDataRights({ customer, onAnonymized }: CustomerDataRightsProps) {
  const { showToast } = useToast();
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [busy, setBusy] = useState(false);

  const alreadyAnonymized = isAnonymised(customer.full_name);

  const handleExport = async () => {
    try {
      const { data, error } = await supabase.rpc("export_carnet_customer", {
        p_customer_id: customer.id,
      });
      if (error) throw new Error(error.message);
      const blob = new Blob([JSON.stringify(data, null, 2)], { type: "application/json" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `client-${customer.id}.json`;
      a.click();
      URL.revokeObjectURL(url);
      showToast(t("toast.dataExported"));
    } catch (err) {
      showToast(err instanceof Error ? err.message : t("common.error"), "error");
    }
  };

  const handleAnonymize = async () => {
    setBusy(true);
    try {
      const { error } = await supabase.rpc("anonymize_carnet_customer", {
        p_customer_id: customer.id,
        p_reason: null,
      });
      if (error) throw new Error(error.message);
      showToast(t("toast.customerAnonymized"));
      setConfirmOpen(false);
      onAnonymized();
    } catch (err) {
      showToast(err instanceof Error ? err.message : t("common.error"), "error");
    } finally {
      setBusy(false);
    }
  };

  return (
    <Card title={t("customerDetail.dataRights")}>
      <p className="text-sm text-body-soft">{t("customerDetail.dataRightsBody")}</p>
      <div className="mt-4 flex flex-wrap gap-3">
        <Button variant="secondary" onClick={handleExport}>
          <Download className="h-4 w-4" aria-hidden="true" />
          {t("customerDetail.exportData")}
        </Button>
        {!alreadyAnonymized && (
          <Button variant="dangerGhost" onClick={() => setConfirmOpen(true)}>
            <UserX className="h-4 w-4" aria-hidden="true" />
            {t("customerDetail.anonymize")}
          </Button>
        )}
      </div>
      {alreadyAnonymized && (
        <p className="mt-3 flex items-center gap-2 text-xs text-body-muted">
          <ShieldCheck className="h-4 w-4" aria-hidden="true" />
          {t("customerDetail.alreadyAnonymized")}
        </p>
      )}

      <ConfirmDialog
        open={confirmOpen}
        loading={busy}
        title={t("customerDetail.anonymizeConfirm.title")}
        body={t("customerDetail.anonymizeConfirm.body")}
        confirmLabel={t("customerDetail.anonymize")}
        onConfirm={handleAnonymize}
        onCancel={() => setConfirmOpen(false)}
      />
    </Card>
  );
}
