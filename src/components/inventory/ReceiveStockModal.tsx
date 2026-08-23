import { Modal } from "../ui/Modal";
import { ReceiveStockForm } from "./ReceiveStockForm";

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
    <Modal open={open} onClose={onClose} title="Réceptionner du stock">
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
