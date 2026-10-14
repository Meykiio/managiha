import { ConfirmDialog } from "../ui/ConfirmDialog";
import { ProductFormModal } from "./ProductFormModal";
import { CategoryManageModal } from "./CategoryManageModal";
import { AdjustStockModal } from "../inventory/AdjustStockModal";
import type { ProductOverview } from "../../lib/types";
import { t } from "../../i18n";

interface ProductsModalsProps {
  addOpen: boolean;
  categoriesOpen: boolean;
  editProduct: ProductOverview | null;
  adjustFor: string | null;
  archiveTarget: ProductOverview | null;
  archiving: boolean;
  onCloseAdd: () => void;
  onCloseCategories: () => void;
  onCloseEdit: () => void;
  onCloseAdjust: () => void;
  onCloseArchive: () => void;
  onSaved: () => void;
  onConfirmArchive: () => void;
}

/**
 * The four dialogs the products page can open, in one place.
 *
 * Extracted when the page reached the 250-line limit, which is also the point at
 * which the page had stopped being about products and started being about
 * orchestration.
 */
export function ProductsModals({
  addOpen,
  categoriesOpen,
  editProduct,
  adjustFor,
  archiveTarget,
  archiving,
  onCloseAdd,
  onCloseCategories,
  onCloseEdit,
  onCloseAdjust,
  onCloseArchive,
  onSaved,
  onConfirmArchive,
}: ProductsModalsProps) {
  const restoring = !!archiveTarget?.archived_at;

  return (
    <>
      <ProductFormModal open={addOpen} onClose={onCloseAdd} onSaved={onSaved} />
      <CategoryManageModal
        open={categoriesOpen}
        onClose={onCloseCategories}
        onChanged={onSaved}
      />
      <ProductFormModal
        open={!!editProduct}
        onClose={onCloseEdit}
        product={editProduct}
        onSaved={onSaved}
      />
      <AdjustStockModal
        open={!!adjustFor}
        onClose={onCloseAdjust}
        presetProductId={adjustFor}
        onSaved={onSaved}
      />
      <ConfirmDialog
        open={!!archiveTarget}
        loading={archiving}
        title={restoring ? t("common.restore") : t("products.archiveConfirm.title")}
        // The restore sentence was hardcoded in French here while the dictionary
        // already carried `products.archive.restoreHint`, so it stayed French in
        // Arabic and English sessions.
        body={
          restoring
            ? t("products.archive.restoreHint", { name: archiveTarget?.name ?? "" })
            : t("products.archiveConfirm.body")
        }
        confirmLabel={restoring ? t("common.restore") : undefined}
        onConfirm={onConfirmArchive}
        onCancel={onCloseArchive}
      />
    </>
  );
}
