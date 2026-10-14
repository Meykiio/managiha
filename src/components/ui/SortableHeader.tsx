import { ArrowDown, ArrowUp, ChevronsUpDown } from "lucide-react";
import { cn } from "../../lib/utils";

export type SortDir = "asc" | "desc";

export interface SortState {
  key: string;
  dir: SortDir;
}

interface SortableHeaderProps {
  label: string;
  sortKey: string;
  sort: SortState;
  onSort: (key: string) => void;
  className?: string;
}

/**
 * A column header that sorts. The arrow is drawn in three states rather than
 * two: unsorted columns still show a faint double chevron, because a header
 * that looks inert until hovered is a feature nobody discovers.
 *
 * `aria-sort` belongs on the `<th>`, not on the button inside it, so the
 * sortable column is announced as sortable by a screen reader when reading the
 * table rather than only when tabbing to the control.
 *
 * The arrows are vertical, so RTL needs no mirrored variant: "ascending" means
 * the same thing on a column of Arabic names as on a column of French ones.
 */
export function SortableHeader({
  label,
  sortKey,
  sort,
  onSort,
  className,
}: SortableHeaderProps) {
  const isActive = sort.key === sortKey;
  const Icon = !isActive ? ChevronsUpDown : sort.dir === "asc" ? ArrowUp : ArrowDown;

  return (
    <th
      scope="col"
      aria-sort={isActive ? (sort.dir === "asc" ? "ascending" : "descending") : "none"}
      className={cn("px-3 py-3 text-start", className)}
    >
      <button
        type="button"
        onClick={() => onSort(sortKey)}
        className={cn(
          // The negative block margin cancels the padding, so the hit area grows
          // to ~40px — the full height of the cell — while the text stays exactly
          // where it was. A header that is technically clickable at 24px is a
          // header people miss on a phone, and this is the sort control for every
          // table in the product.
          "-mx-1 -my-3 inline-flex items-center gap-1.5 rounded px-1 py-3 text-xs font-medium uppercase tracking-wide",
          "transition-colors duration-fast ease-snappy",
          isActive ? "text-body" : "text-body-soft hover:text-body"
        )}
      >
        {label}
        <Icon
          className={cn("h-3.5 w-3.5 shrink-0", isActive ? "text-primary" : "text-body-muted")}
          aria-hidden="true"
        />
      </button>
    </th>
  );
}
