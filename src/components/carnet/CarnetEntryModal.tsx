import { Modal } from "../ui/Modal";
import { CarnetEntryForm } from "./CarnetEntryForm";
import type { TransactionType } from "../../lib/types";
import { t } from "../../i18n";

interface CarnetEntryModalProps {
  open: boolean;
  onClose: () => void;
  presetCustomerId?: string | null;
  presetType?: TransactionType;
  onSaved?: () => void;
}

export function CarnetEntryModal({
  open,
  onClose,
  presetCustomerId,
  presetType,
  onSaved,
}: CarnetEntryModalProps) {
  return (
    <Modal open={open} onClose={onClose} title={t("carnetEntry.title")}>
      <div className="pb-3">
        {open && (
          <CarnetEntryForm
            key={`${presetCustomerId ?? "new"}-${presetType ?? "default"}-${open}`}
            presetCustomerId={presetCustomerId}
            presetType={presetType}
            onSuccess={() => {
              onSaved?.();
              onClose();
            }}
          />
        )}
      </div>
    </Modal>
  );
}
