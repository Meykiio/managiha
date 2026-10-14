import { useEffect, useRef, useState, useId } from "react";
import { ChevronDown, Search } from "lucide-react";
import { cn } from "../../lib/utils";
import { searchCarnetCustomers, fetchCarnetCustomer } from "../../lib/api";
import { fmtMoney } from "../../lib/format";
import { useComboKeyboard } from "../../hooks/useComboKeyboard";
import { t } from "../../i18n";
import type { CarnetCustomer } from "../../lib/types";

interface CustomerSelectProps {
  value: string | null;
  onChange: (customerId: string | null) => void;
  storeId: string;
  label?: string;
}

export function CustomerSelect({ value, onChange, storeId, label }: CustomerSelectProps) {
  const selectId = useId();
  const [results, setResults] = useState<CarnetCustomer[]>([]);
  const [preselected, setPreselected] = useState<CarnetCustomer | null>(null);
  const [search, setSearch] = useState("");
  const [open, setOpen] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const timer = window.setTimeout(() => {
      searchCarnetCustomers(storeId, search)
        .then(setResults)
        .catch(() => setResults([]));
    }, 200);
    return () => window.clearTimeout(timer);
  }, [open, search, storeId]);

  /**
   * A value handed in from another screen — the customer detail page presets it —
   * arrives before any search has run, so without this the closed picker reads
   * "customer selected" instead of a name.
   */
  useEffect(() => {
    if (!value) {
      setPreselected(null);
      return;
    }
    let cancelled = false;
    fetchCarnetCustomer(storeId, value)
      .then((row) => {
        if (!cancelled) setPreselected(row);
      })
      .catch(() => {
        if (!cancelled) setPreselected(null);
      });
    return () => {
      cancelled = true;
    };
  }, [storeId, value]);

  useEffect(() => {
    if (!open) return;
    const handler = (e: MouseEvent) => {
      if (rootRef.current && !rootRef.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [open]);

  const selectedName =
    results.find((c) => c.id === value)?.full_name ?? preselected?.full_name ?? null;

  const { activeIndex, setActiveIndex, listRef, onKeyDown } = useComboKeyboard({
    itemCount: results.length,
    onSelect: (index) => {
      const customer = results[index];
      if (customer) {
        onChange(customer.id);
        setOpen(false);
      }
    },
    onClose: () => setOpen(false),
  });

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
          open
            ? "border-primary ring-2 ring-primary-tint"
            : "border-line-hi hover:border-line-hi"
        )}
      >
        <span className="truncate">
          {selectedName ?? <span className="text-body-muted">{t("customerSelect.search")}</span>}
        </span>
        <ChevronDown className="h-4 w-4 shrink-0 text-body-muted" />
      </button>
      {open && (
        <div className="absolute inset-x-0 z-20 mt-1 max-h-72 overflow-hidden rounded-xl border border-line bg-surface shadow-popover">
          <div className="border-b border-line p-2">
            <div className="relative">
              <Search className="pointer-events-none absolute inset-y-0 start-3 my-auto h-4 w-4 text-body-muted" />
              <input
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                onKeyDown={onKeyDown}
                placeholder={t("customerSelect.search")}
                className="h-10 w-full rounded-lg border border-line ps-9 pe-3 text-sm focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary-tint"
              />
            </div>
          </div>
          <ul role="listbox" ref={listRef} className="max-h-56 overflow-y-auto p-1.5">
            {results.length === 0 && (
              <li className="px-3 py-2 text-sm text-body-muted">{t("customerSelect.empty")}</li>
            )}
            {results.map((c, index) => (
              <li key={c.id}>
                <button
                  type="button"
                  onClick={() => {
                    onChange(c.id);
                    setOpen(false);
                  }}
                  onMouseEnter={() => setActiveIndex(index)}
                  className={cn(
                    "flex w-full items-center justify-between gap-3 rounded-lg px-3 py-2.5 text-start text-sm hover:bg-surface-mid",
                    index === activeIndex && "bg-primary-tint"
                  )}
                >
                  <span className="truncate font-medium text-body">{c.full_name}</span>
                  <span className="tnum shrink-0 text-xs text-body-muted">
                    {fmtMoney(c.balance)}
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
