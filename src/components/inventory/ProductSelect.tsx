import { useEffect, useMemo, useRef, useState } from "react";
import { ChevronDown, Search } from "lucide-react";
import { cn } from "../../lib/utils";
import { fmtQty } from "../../lib/format";
import { unitShort } from "../../lib/constants";
import { fetchActiveProductsLite, type ProductLite } from "../../lib/api";
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

export function ProductSelect({ value, onChange, storeId, label }: ProductSelectProps) {
  const [products, setProducts] = useState<ProductLite[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [search, setSearch] = useState("");
  const [open, setOpen] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    fetchActiveProductsLite(storeId)
      .then((rows) => {
        if (!cancelled) setProducts(rows);
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
  }, [storeId]);

  useEffect(() => {
    if (!open) return;
    const handler = (e: MouseEvent) => {
      if (rootRef.current && !rootRef.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [open]);

  const selected = useMemo(
    () => products.find((p) => p.id === value) ?? null,
    [products, value]
  );

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return products.slice(0, 30);
    return products
      .slice(0, 100)
      .filter((p) => p.name.toLowerCase().includes(q))
      .slice(0, 30);
  }, [products, search]);

  const { activeIndex, setActiveIndex, listRef, onKeyDown } = useComboKeyboard({
    itemCount: filtered.length,
    onSelect: (index) => {
      const product = filtered[index];
      if (product) {
        onChange(product.id);
        setOpen(false);
        setSearch("");
      }
    },
    onClose: () => setOpen(false),
  });

  return (
    <div className="relative w-full" ref={rootRef}>
      {label && (
        <span className="mb-1.5 block text-sm font-medium text-neutral-700">{label}</span>
      )}
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-haspopup="listbox"
        aria-expanded={open}
        className={cn(
          "flex h-11 w-full items-center justify-between gap-2 rounded-lg border bg-white px-3.5 text-sm transition",
          open ? "border-primary-500 ring-2 ring-primary-100" : "border-neutral-300 hover:border-neutral-400"
        )}
      >
        <span className="truncate">
          {loading ? (
            <span className="flex items-center gap-2 text-neutral-400">
              <Spinner className="h-4 w-4" /> {t("common.loading")}
            </span>
          ) : selected ? (
            selected.name
          ) : (
            <span className="text-neutral-400">{t("productSelect.search")}</span>
          )}
        </span>
        <ChevronDown className="h-4 w-4 shrink-0 text-neutral-400" />
      </button>
      {selected && !open && (
        <p className="mt-1 text-xs text-neutral-500">
          {t("productSelect.stockCurrent")}{" "}
          <span className="font-semibold tnum">{fmtQty(selected.current_stock)}</span>{" "}
          {unitShort(selected.unit)} ·{" "}
          <Badge tone={stockStatusTone(selected.stock_status)} dot>
            {STATUS_LABEL[selected.stock_status]}
          </Badge>
        </p>
      )}
      {open && (
        <div className="absolute inset-x-0 z-20 mt-1 max-h-72 overflow-hidden rounded-xl border border-neutral-200 bg-white shadow-popover">
          <div className="border-b border-neutral-100 p-2">
            <div className="relative">
              <Search className="pointer-events-none absolute inset-y-0 start-3 my-auto h-4 w-4 text-neutral-400" />
              <input
                autoFocus
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                onKeyDown={onKeyDown}
                placeholder={t("productSelect.search")}
                className="h-10 w-full rounded-lg border border-neutral-200 ps-9 pe-3 text-sm focus:border-primary-500 focus:outline-none focus:ring-2 focus:ring-primary-100"
              />
            </div>
          </div>
          <ul role="listbox" ref={listRef} className="max-h-56 overflow-y-auto p-1.5">
            {error && <li className="px-3 py-2 text-sm text-red-600">{error}</li>}
            {!loading && filtered.length === 0 && !error && (
              <li className="px-3 py-2 text-sm text-neutral-500">{t("productSelect.empty")}</li>
            )}
            {filtered.map((p, index) => (
              <li key={p.id}>
                <button
                  type="button"
                  onClick={() => {
                    onChange(p.id);
                    setOpen(false);
                    setSearch("");
                  }}
                  onMouseEnter={() => setActiveIndex(index)}
                  className={cn(
                    "flex w-full items-center justify-between gap-3 rounded-lg px-3 py-2.5 text-start text-sm hover:bg-neutral-50",
                    index === activeIndex && "bg-primary-50"
                  )}
                >
                  <span className="truncate font-medium text-neutral-800">{p.name}</span>
                  <span className="tnum shrink-0 text-xs text-neutral-500">
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
