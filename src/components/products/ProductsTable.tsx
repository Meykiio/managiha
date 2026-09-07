import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { Archive, ArchiveRestore, Eye, Image, Pencil, Scale } from "lucide-react";
import { Badge, stockStatusTone, type BadgeTone } from "../ui/Badge";
import { Button } from "../ui/Button";
import type { Category, ProductOverview, StockStatus } from "../../lib/types";
import { fmtMoneyShort, fmtQty } from "../../lib/format";
import { unitShort } from "../../lib/constants";
import { t } from "../../i18n";
import { getProductImageUrl } from "../../lib/api";
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
      <span className="flex h-10 w-10 items-center justify-center rounded-lg bg-neutral-100 text-neutral-400">
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
  onEdit: (product: ProductOverview) => void;
  onAdjust: (productId: string) => void;
  onArchiveToggle: (product: ProductOverview) => void;
}

export function ProductsTable({
  rows,
  categories,
  showArchivedList,
  archiveLabel,
  onEdit,
  onAdjust,
  onArchiveToggle,
}: ProductsTableProps) {
  return (
    <div className="overflow-x-auto">
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b border-neutral-200 bg-neutral-50 text-xs font-semibold uppercase tracking-wide text-neutral-500">
            <th className="px-5 py-3 text-start" colSpan={2}>{t("products.table.name")}</th>
            <th className="px-3 py-3 text-start">{t("products.table.stock")}</th>
            <th className="px-3 py-3 text-start">{t("products.table.sellPrice")}</th>
            <th className="px-3 py-3 text-start hidden md:table-cell">{t("products.table.category")}</th>
            <th className="px-5 py-3 text-end">{t("common.actions")}</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-neutral-100">
          {rows.map((p) => (
            <tr key={p.id} className="hover:bg-neutral-50/60">
              <td className="px-5 py-3.5">
                <ProductThumbnail productId={p.id} name={p.name} />
              </td>
              <td className="max-w-[16rem] px-5 py-3.5">
                <Link
                  to={`/products/${p.id}`}
                  className="block truncate font-medium text-neutral-900 hover:text-primary-700"
                >
                  {p.name}
                </Link>
                {(p.sku || p.barcode) && (
                  <span className="tnum block truncate text-xs text-neutral-400">
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
                    <span className="tnum ms-2 whitespace-nowrap text-neutral-600">
                      {fmtQty(p.current_stock)} {unitShort(p.unit)}
                    </span>
                  </>
                )}
              </td>
              <td className="tnum whitespace-nowrap px-3 py-3.5 text-neutral-800">
                {fmtMoneyShort(p.sell_price)}
              </td>
              <td className="hidden px-3 py-3.5 text-neutral-500 md:table-cell">
                {categories.find((c) => c.id === p.category_id)?.name ?? "—"}
              </td>
              <td className="px-5 py-3.5">
                <div className="flex items-center justify-end gap-1">
                  <Link
                    to={`/products/${p.id}`}
                    title={t("common.view")}
                    className="flex h-11 w-11 items-center justify-center rounded-lg text-neutral-500 transition-colors hover:bg-neutral-100 hover:text-neutral-800"
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
                    className="text-red-500 hover:bg-red-50"
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
