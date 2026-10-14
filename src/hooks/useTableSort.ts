import { useCallback, useState } from "react";
import type { SortState } from "../components/ui/SortableHeader";

interface UseTableSortOptions {
  initial?: SortState;
  /** Called on every sort change — used to return to page 1. */
  onChange?: () => void;
}

/**
 * Sort state for a server-paginated table.
 *
 * Clicking the active column flips its direction; clicking a different column
 * starts that column ascending. The alternative — carrying the previous
 * direction over to the new column — means the first click on "stock" after
 * sorting by "name" descending shows the largest values first, which is
 * sometimes what you want and never what you expect.
 */
export function useTableSort({ initial = { key: "name", dir: "asc" }, onChange }: UseTableSortOptions = {}) {
  const [sort, setSort] = useState<SortState>(initial);

  const toggleSort = useCallback(
    (key: string) => {
      setSort((prev) =>
        prev.key === key ? { key, dir: prev.dir === "asc" ? "desc" : "asc" } : { key, dir: "asc" }
      );
      onChange?.();
    },
    [onChange]
  );

  return { sort, toggleSort };
}
