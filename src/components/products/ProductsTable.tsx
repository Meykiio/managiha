import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { Archive, ArchiveRestore, Eye, Image, Pencil, Scale } from "lucide-react";
import { Badge, type BadgeTone } from "../ui/Badge";
import { Button } from "../ui/Button";
import { SortableHeader, type SortState } from "../ui/SortableHeader";
import type { Category, ProductOverview, StockStatus } from "../../lib/types";
import { fmtMoneyShort, fmtQty } from "../../lib/format";
import { unitShort } from "../../lib/constants";
import { t } from "../../i18n";
import { getProductImageUrl } from "../../lib/productImages";
import { useAuth } from "../../contexts/AuthContext";

function ProductThumbnail({ productId, name }: { productId: string; name: string }) {
  const { store } = useAuth();
  const [url, setUrl] = useState<string | null>(null);

  useEffect(() => {
    if (!store) return;
    let cancelled = false;
    getProductImageUrl(store.id, productId)
      .then((u) => { if (!cancelled) setUrl(u); })
      .catch(() => { if (!cancelled) setUrl(null); });
    return () => { cancelled = true; };
  }, [store, productId]);

  if (!url) {
    return (
      <span className="flex h-10 w-10 items-center justify-center rounded-lg bg-surface-high text-body-muted">
        <Image className="h-5 w-5" />
      </span>
    );
  }
  return <img src={url} alt={name} className="h-10 w-10 rounded-lg object-cover" />;
}

const STATUS_TONE: Record<StockStatus, BadgeTone> = {
  healthy: "success",
  low: "warning",
  out: "danger",
};

const STATUS_LABEL: Record<StockStatus, string> = {
  healthy: t("products.status.healthy"),
  low: t("products.status.low"),
  out: t("products.status.out"),
};

interface ProductsTableProps {
  rows: ProductOverview[];
  categories: Category[];
  showArchivedList: boolean;
  archiveLabel: string;
  sort: SortState;
  onSort: (key: string) => void;
  onEdit: (product: ProductOverview) => void;
  onAdjust: (productId: string) => void;
  onArchiveToggle: (product: ProductOverview) => void;
}

export function ProductsTable({
  rows,
  categories,
  showArchivedList,
  archiveLabel,
  sort,
  onSort,
  onEdit,
  onAdjust,
  onArchiveToggle,
}: ProductsTableProps) {
  return (
    <div className="overflow-x-auto">
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b border-line bg-bg text-xs font-semibold uppercase tracking-wide text-body-muted">
            {/* The thumbnail column carries no heading of its own; the name heading
                spans it visually, so this cell is decoration and is hidden. */}
            <th className="w-14 px-5 py-3" aria-hidden="true" />
            <SortableHeader
              label={t("products.table.name")}
              sortKey="name"
              sort={sort}
              onSort={onSort}
            />
            <SortableHeader
              label={t("products.table.stock")}
              sortKey="current_stock"
              sort={sort}
              onSort={onSort}
            />
            <SortableHeader
              label={t("products.table.sellPrice")}
              sortKey="sell_price"
              sort={sort}
              onSort={onSort}
            />
            <th scope="col" className="px-3 py-3 text-start hidden md:table-cell">{t("products.table.category")}</th>
            <th scope="col" className="px-5 py-3 text-end">{t("common.actions")}</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-line">
          {rows.map((p) => (
            <tr key={p.id} className="hover:bg-surface-mid/60">
              <td className="px-5 py-3.5">
                <ProductThumbnail productId={p.id} name={p.name} />
              </td>
              <td className="max-w-[16rem] px-5 py-3.5">
                <Link
                  to={`/products/${p.id}`}
                  className="-my-2 block truncate py-2 font-medium text-body hover:opacity-80"
                >
                  {p.name}
                </Link>
                {(p.sku || p.barcode) && (
                  <span className="tnum block truncate text-xs text-body-muted">
                    {[p.sku, p.barcode].filter(Boolean).join(" · ")}
                  </span>
                )}
              </td>
              <td className="px-3 py-3.5">
                {showArchivedList ? (
                  <Badge tone="neutral">{t("common.archived")}</Badge>
                ) : (
                  <>
                    <Badge tone={STATUS_TONE[p.stock_status]} dot>
                      {STATUS_LABEL[p.stock_status]}
                    </Badge>
                    <span className="tnum ms-2 whitespace-nowrap text-body-soft">
                      {fmtQty(p.current_stock)} {unitShort(p.unit)}
                    </span>
                  </>
                )}
              </td>
              <td className="tnum whitespace-nowrap px-3 py-3.5 text-body">
                {fmtMoneyShort(p.sell_price)}
              </td>
              <td className="hidden px-3 py-3.5 text-body-muted md:table-cell">
                {categories.find((c) => c.id === p.category_id)?.name ?? "—"}
              </td>
              <td className="px-5 py-3.5">
                <div className="flex items-center justify-end gap-1">
                  <Link
                    to={`/products/${p.id}`}
                    title={t("common.view")}
                    className="flex h-11 w-11 items-center justify-center rounded-lg text-body-muted transition-colors hover:bg-surface-high hover:text-body"
                  >
                    <Eye className="h-[18px] w-[18px]" />
                  </Link>
                  <Button variant="ghost" size="icon" title={t("common.edit")} onClick={() => onEdit(p)}>
                    <Pencil className="h-[18px] w-[18px]" />
                  </Button>
                  <Button
                    variant="ghost"
                    size="icon"
                    title={t("inventory.tab.adjust")}
                    disabled={showArchivedList}
                    onClick={() => onAdjust(p.id)}
                  >
                    <Scale className="h-[18px] w-[18px]" />
                  </Button>
                  <Button
                    variant="ghost"
                    size="icon"
                    title={archiveLabel}
                    className="text-error-fg hover:bg-error-tint"
                    onClick={() => onArchiveToggle(p)}
                  >
                    {p.archived_at ? (
                      <ArchiveRestore className="h-[18px] w-[18px]" />
                    ) : (
                      <Archive className="h-[18px] w-[18px]" />
                    )}
                  </Button>
                </div>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
