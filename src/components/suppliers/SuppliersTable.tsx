import { Link } from "react-router-dom";
import { Archive, ArchiveRestore, Pencil, Phone } from "lucide-react";
import { Button } from "../ui/Button";
import { Badge } from "../ui/Badge";
import { waLink, fmtQty } from "../../lib/format";
import { t } from "../../i18n";
import type { Supplier } from "../../lib/types";

export type SupplierRow = Supplier & { product_count: number };

interface SuppliersTableProps {
  rows: SupplierRow[];
  showArchived: boolean;
  onEdit: (supplier: Supplier) => void;
  onArchiveToggle: (supplier: Supplier) => void;
}

/**
 * Split out of SuppliersPage to keep that file under the 250-line limit. It holds
 * no state: every decision it could make is already the caller's.
 */
export function SuppliersTable({
  rows,
  showArchived,
  onEdit,
  onArchiveToggle,
}: SuppliersTableProps) {
  return (
    <div className="overflow-x-auto">
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b border-line bg-bg text-xs font-semibold uppercase tracking-wide text-body-muted">
            <th className="px-5 py-3 text-start">{t("suppliers.table.name")}</th>
            <th className="px-3 py-3 text-start">{t("suppliers.table.contact")}</th>
            <th className="hidden px-3 py-3 text-start md:table-cell">
              {t("suppliers.table.address")}
            </th>
            <th className="px-3 py-3 text-start">{t("suppliers.table.products")}</th>
            <th className="px-5 py-3 text-end">{t("common.actions")}</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-line">
          {rows.map((s) => {
            const wa = waLink(s.whatsapp, "");
            return (
              <tr key={s.id} className="hover:bg-surface-mid/60">
                <td className="px-5 py-3.5">
                  <span className="font-medium text-body">{s.name}</span>
                  {s.notes && (
                    <span className="block max-w-[16rem] truncate text-xs text-body-muted">
                      {s.notes}
                    </span>
                  )}
                </td>
                <td className="px-3 py-3.5">
                  {s.phone && (
                    <a
                      href={`tel:${s.phone}`}
                      className="tnum flex items-center gap-1.5 text-body-soft hover:opacity-80"
                    >
                      <Phone className="h-3.5 w-3.5" />
                      {s.phone}
                    </a>
                  )}
                  {wa && (
                    <a
                      href={wa}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="mt-0.5 inline-flex items-center py-1 text-xs font-medium text-positive-fg hover:opacity-80"
                    >
                      {t("suppliers.whatsapp")}
                    </a>
                  )}
                  {!s.phone && !wa && "—"}
                </td>
                <td className="hidden max-w-[14rem] truncate px-3 py-3.5 text-body-muted md:table-cell">
                  {s.address ?? "—"}
                </td>
                <td className="tnum px-3 py-3.5 text-body-soft">
                  {/* The count is the doorway: "18 products" is a fact, clicking it
                      is the answer to "which ones?". */}
                  <Link
                    to={`/products?supplier=${s.id}`}
                    className="inline-block py-1 hover:text-primary hover:underline"
                  >
                    {t("suppliers.productsCount", { count: fmtQty(s.product_count) })}
                  </Link>
                </td>
                <td className="px-5 py-3.5">
                  <div className="flex items-center justify-end gap-1">
                    {showArchived && <Badge tone="neutral">{t("common.archived")}</Badge>}
                    <Button
                      variant="ghost"
                      size="icon"
                      title={t("common.edit")}
                      aria-label={t("common.edit")}
                      onClick={() => onEdit(s)}
                    >
                      <Pencil className="h-[18px] w-[18px]" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      title={s.archived_at ? t("common.restore") : t("common.archive")}
                      aria-label={s.archived_at ? t("common.restore") : t("common.archive")}
                      className="text-error-fg hover:bg-error-tint"
                      onClick={() => onArchiveToggle(s)}
                    >
                      {s.archived_at ? (
                        <ArchiveRestore className="h-[18px] w-[18px]" />
                      ) : (
                        <Archive className="h-[18px] w-[18px]" />
                      )}
                    </Button>
                  </div>
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}