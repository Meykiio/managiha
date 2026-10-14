import { ConfirmDialog } from "../ui/ConfirmDialog";
import { ReceiveStockModal } from "../inventory/ReceiveStockModal";
import { AdjustStockModal } from "../inventory/AdjustStockModal";
import type { Product } from "../../lib/types";
import { t } from "../../i18n";

interface ProductDetailModalsProps {
  product: Product;
  archiveOpen: boolean;
  archiving: boolean;
  receiveOpen: boolean;
  adjustOpen: boolean;
  onCloseArchive: () => void;
  onCloseReceive: () => void;
  onCloseAdjust: () => void;
  onConfirmArchive: () => void;
  onChanged: () => void;
}

/**
 * The three dialogs reachable from a product: receive, adjust, archive.
 *
 * Extracted when the page reached the line limit, which is a reasonable signal
 * that a page has stopped being one screen and started being a hub.
 */
export function ProductDetailModals({
  product,
  archiveOpen,
  archiving,
  receiveOpen,
  adjustOpen,
  onCloseArchive,
  onCloseReceive,
  onCloseAdjust,
  onConfirmArchive,
  onChanged,
}: ProductDetailModalsProps) {
  const restoring = !!product.archived_at;

  return (
    <>
      <ReceiveStockModal
        open={receiveOpen}
        onClose={onCloseReceive}
        presetProductId={product.id}
        onSaved={onChanged}
      />
      <AdjustStockModal
        open={adjustOpen}
        onClose={onCloseAdjust}
        presetProductId={product.id}
        onSaved={onChanged}
      />
      <ConfirmDialog
        open={archiveOpen}
        loading={archiving}
        title={restoring ? t("common.restore") : t("products.archiveConfirm.title")}
        body={t("products.archiveConfirm.body")}
        confirmLabel={restoring ? t("common.restore") : undefined}
        onConfirm={onConfirmArchive}
        onCancel={onCloseArchive}
      />
    </>
  );
}
