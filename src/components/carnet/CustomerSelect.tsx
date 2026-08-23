import { useEffect, useRef, useState } from "react";
import { ChevronDown, Search } from "lucide-react";
import { cn } from "../../lib/utils";
import { searchCarnetCustomers } from "../../lib/api";
import { fmtMoney } from "../../lib/format";
import type { CarnetCustomer } from "../../lib/types";

interface CustomerSelectProps {
  value: string | null;
  onChange: (customerId: string | null) => void;
  storeId: string;
}

export function CustomerSelect({ value, onChange, storeId }: CustomerSelectProps) {
  const [results, setResults] = useState<CarnetCustomer[]>([]);
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

  useEffect(() => {
    if (!open) return;
    const handler = (e: MouseEvent) => {
      if (rootRef.current && !rootRef.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [open]);

  const selectedName =
    results.find((c) => c.id === value)?.full_name ??
    (value ? "Client sélectionné" : null);

  return (
    <div className="relative w-full" ref={rootRef}>
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-haspopup="listbox"
        aria-expanded={open}
        className={cn(
          "flex h-11 w-full items-center justify-between gap-2 rounded-lg border bg-white px-3.5 text-sm transition",
          open
            ? "border-primary-500 ring-2 ring-primary-100"
            : "border-neutral-300 hover:border-neutral-400"
        )}
      >
        <span className="truncate">
          {selectedName ?? <span className="text-neutral-400">Rechercher un client…</span>}
        </span>
        <ChevronDown className="h-4 w-4 shrink-0 text-neutral-400" />
      </button>
      {open && (
        <div className="absolute inset-x-0 z-20 mt-1 max-h-72 overflow-hidden rounded-xl border border-neutral-200 bg-white shadow-popover">
          <div className="border-b border-neutral-100 p-2">
            <div className="relative">
              <Search className="pointer-events-none absolute inset-y-0 start-3 my-auto h-4 w-4 text-neutral-400" />
              <input
                autoFocus
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Rechercher un client…"
                className="h-10 w-full rounded-lg border border-neutral-200 ps-9 pe-3 text-sm focus:border-primary-500 focus:outline-none focus:ring-2 focus:ring-primary-100"
              />
            </div>
          </div>
          <ul role="listbox" className="max-h-56 overflow-y-auto p-1.5">
            {!open && null}
            {results.length === 0 && (
              <li className="px-3 py-2 text-sm text-neutral-500">Aucun client trouvé</li>
            )}
            {results.map((c) => (
              <li key={c.id}>
                <button
                  type="button"
                  onClick={() => {
                    onChange(c.id);
                    setOpen(false);
                  }}
                  className="flex w-full items-center justify-between gap-3 rounded-lg px-3 py-2.5 text-start text-sm hover:bg-neutral-50"
                >
                  <span className="truncate font-medium text-neutral-800">{c.full_name}</span>
                  <span className="tnum shrink-0 text-xs text-neutral-500">
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
