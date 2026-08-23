import { AlertTriangle } from "lucide-react";
import { Button } from "./Button";
import { Modal } from "./Modal";
import { t } from "../../i18n";

interface ConfirmDialogProps {
  open: boolean;
  title: string;
  body: string;
  confirmLabel?: string;
  cancelLabel?: string;
  loading?: boolean;
  onConfirm: () => void;
  onCancel: () => void;
}

export function ConfirmDialog({
  open,
  title,
  body,
  confirmLabel,
  cancelLabel,
  loading,
  onConfirm,
  onCancel,
}: ConfirmDialogProps) {
  return (
    <Modal
      open={open}
      onClose={onCancel}
      title={title}
      footer={
        <>
          <Button variant="secondary" onClick={onCancel} disabled={loading}>
            {cancelLabel ?? t("common.cancel")}
          </Button>
          <Button variant="danger" onClick={onConfirm} loading={loading}>
            {confirmLabel ?? t("common.confirm")}
          </Button>
        </>
      }
    >
      <div className="flex items-start gap-3 pb-2">
        <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-red-50">
          <AlertTriangle className="h-5 w-5 text-red-600" />
        </span>
        <p className="pt-1.5 text-sm leading-relaxed text-neutral-600">{body}</p>
      </div>
    </Modal>
  );
}
