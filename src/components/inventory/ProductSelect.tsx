import { useCallback, useEffect, useMemo, useRef, useState, useId } from "react";
import { ChevronDown, Search } from "lucide-react";
import { cn } from "../../lib/utils";
import { fmtQty } from "../../lib/format";
import { unitShort } from "../../lib/constants";
import {
  fetchProductLite,
  searchProductsLite,
  type ProductLite,
} from "../../lib/api";
import { useDebounced } from "../../hooks/useDebounced";
import { stockStatusTone, Badge } from "../ui/Badge";
import { Spinner } from "../ui/Spinner";
import { useComboKeyboard } from "../../hooks/useComboKeyboard";
import { t } from "../../i18n";
import type { StockStatus } from "../../lib/types";

const STATUS_LABEL: Record<StockStatus, string> = {
  healthy: "OK",
  low: t("scanner.status.low"),
  out: t("scanner.status.out"),
};

interface ProductSelectProps {
  value: string | null;
  onChange: (productId: string | null) => void;
  storeId: string;
  label?: string;
}

/**
 * Product picker for the inventory and lot forms.
 *
 * Search runs on the server. The earlier version downloaded a page of products
 * and filtered them in the browser, which quietly made anything past that page
 * unselectable — typing the exact name returned "no match" for a product that
 * exists. For a shop with a few thousand references that is not a rough edge, it
 * is the difference between the form working and not.
 */
export function ProductSelect({ value, onChange, storeId, label }: ProductSelectProps) {
  const selectId = useId();
  const [results, setResults] = useState<ProductLite[]>([]);
  const [selected, setSelected] = useState<ProductLite | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [search, setSearch] = useState("");
  const [open, setOpen] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);
  const debouncedSearch = useDebounced(search);

  /**
   * The collapsed label needs the whole row, which the search results may not
   * contain — a preset value arrives from another screen with no query behind it.
   */
  useEffect(() => {
    let cancelled = false;
    if (!value) {
      setSelected(null);
      return;
    }
    const known = results.find((p) => p.id === value);
    if (known) {
      setSelected(known);
      return;
    }
    fetchProductLite(storeId, value)
      .then((row) => {
        if (!cancelled) setSelected(row);
      })
      .catch(() => {
        if (!cancelled) setSelected(null);
      });
    return () => {
      cancelled = true;
    };
  }, [value, storeId, results]);

  useEffect(() => {
    if (!open) return;
    const handler = (e: MouseEvent) => {
      if (rootRef.current && !rootRef.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [open]);

  const pick = useCallback(
    (product: ProductLite) => {
      onChange(product.id);
      setSelected(product);
      setOpen(false);
      setSearch("");
    },
    [onChange]
  );

  const { activeIndex, setActiveIndex, listRef, onKeyDown } = useComboKeyboard({
    itemCount: results.length,
    onSelect: (index) => {
      const product = results[index];
      if (product) pick(product);
    },
    onClose: () => setOpen(false),
  });

  useEffect(() => {
    const term = debouncedSearch.trim();
    if (!open || term.length < 2) {
      setResults([]);
      setLoading(false);
      return;
    }
    let cancelled = false;
    setLoading(true);
    searchProductsLite(storeId, term)
      .then((rows) => {
        if (!cancelled) {
          setResults(rows);
          setError("");
        }
      })
      .catch((err) => {
        if (!cancelled) setError(err instanceof Error ? err.message : t("productSelect.error"));
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [open, debouncedSearch, storeId]);

  const showResults = useMemo(() => debouncedSearch.trim().length >= 2, [debouncedSearch]);

  return (
    <div className="relative w-full" ref={rootRef}>
      {label && (
        <label htmlFor={selectId} className="mb-1.5 block text-sm font-medium text-body-soft">{label}</label>
      )}
      <button
        id={selectId}
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-haspopup="listbox"
        aria-expanded={open}
        className={cn(
          "flex h-11 w-full items-center justify-between gap-2 rounded-lg border bg-surface px-3.5 text-sm transition",
          open ? "border-primary ring-2 ring-primary-tint" : "border-line-hi hover:border-line-hi"
        )}
      >
        <span className="truncate">
          {selected ? (
            selected.name
          ) : (
            <span className="text-body-muted">{t("productSelect.search")}</span>
          )}
        </span>
        <ChevronDown className="h-4 w-4 shrink-0 text-body-muted" />
      </button>
      {selected && !open && (
        <p className="mt-1 text-xs text-body-muted">
          {t("productSelect.stockCurrent")}{" "}
          <span className="font-semibold tnum">{fmtQty(selected.current_stock)}</span>{" "}
          {unitShort(selected.unit)} ·{" "}
          <Badge tone={stockStatusTone(selected.stock_status)} dot>
            {STATUS_LABEL[selected.stock_status]}
          </Badge>
        </p>
      )}
      {open && (
        <div className="absolute inset-x-0 z-20 mt-1 max-h-72 overflow-hidden rounded-xl border border-line bg-surface shadow-popover">
          <div className="border-b border-line p-2">
            <div className="relative">
              <Search className="pointer-events-none absolute inset-y-0 start-3 my-auto h-4 w-4 text-body-muted" />
              <input
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                onKeyDown={onKeyDown}
                placeholder={t("productSelect.search")}
                className="h-10 w-full rounded-lg border border-line ps-9 pe-3 text-sm focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary-tint"
              />
            </div>
          </div>
          <ul role="listbox" ref={listRef} className="max-h-56 overflow-y-auto p-1.5">
            {error && <li className="px-3 py-2 text-sm text-error-fg">{error}</li>}
            {loading && (
              <li className="flex items-center gap-2 px-3 py-2 text-sm text-body-muted">
                <Spinner className="h-4 w-4" /> {t("productSelect.loading")}
              </li>
            )}
            {!loading && !showResults && !error && (
              <li className="px-3 py-2 text-sm text-body-muted">{t("productSelect.typeToSearch")}</li>
            )}
            {!loading && showResults && results.length === 0 && !error && (
              <li className="px-3 py-2 text-sm text-body-muted">{t("productSelect.empty")}</li>
            )}
            {results.map((p, index) => (
              <li key={p.id}>
                <button
                  type="button"
                  onClick={() => pick(p)}
                  onMouseEnter={() => setActiveIndex(index)}
                  className={cn(
                    "flex w-full items-center justify-between gap-3 rounded-lg px-3 py-2.5 text-start text-sm hover:bg-surface-mid",
                    index === activeIndex && "bg-primary-tint"
                  )}
                >
                  <span className="truncate font-medium text-body">{p.name}</span>
                  <span className="tnum shrink-0 text-xs text-body-muted">
                    {fmtQty(p.current_stock)} {unitShort(p.unit)}
                  </span>
                </button>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}
