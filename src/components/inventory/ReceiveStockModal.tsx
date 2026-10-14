import { Modal } from "../ui/Modal";
import { ReceiveStockForm } from "./ReceiveStockForm";
import { t } from "../../i18n";

interface ReceiveStockModalProps {
  open: boolean;
  onClose: () => void;
  presetProductId?: string | null;
  onSaved?: () => void;
}

export function ReceiveStockModal({
  open,
  onClose,
  presetProductId,
  onSaved,
}: ReceiveStockModalProps) {
  return (
    <Modal open={open} onClose={onClose} title={t("inventory.receive.title")}>
      <div className="pb-3">
        <ReceiveStockForm
          presetProductId={open ? (presetProductId ?? null) : null}
          onSuccess={() => {
            onSaved?.();
            onClose();
          }}
        />
      </div>
    </Modal>
  );
}
