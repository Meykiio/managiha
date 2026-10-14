import { useRef, type FormEvent } from "react";
import { Plus, Search } from "lucide-react";
import { useAuth } from "../../contexts/AuthContext";
import { useProductSearch } from "../../hooks/useProductSearch";
import { fmtMoney } from "../../lib/format";
import { unitShort } from "../../lib/constants";
import type { Product } from "../../lib/types";
import { t } from "../../i18n";

interface ProductSearchBarProps {
  onPick: (product: Product) => void;
  onCreate: (term: string) => void;
}

/**
 * The counter's second way in, next to the camera.
 *
 * A quartier grocery sells a lot of things with no usable barcode — bulk goods,
 * repackaged rice and spices, anything bought by the sack. A barcode-only field
 * leaves those products unsellable from the sell flow.
 *
 * Deliberately not a full ARIA combobox. The honest pattern is an input with a
 * list of buttons below it: every result is reachable by Tab, which the input is
 * wired to with aria-controls. Claiming combobox semantics would promise arrow-key
 * navigation and an active descendant that are not implemented.
 */
export function ProductSearchBar({ onPick, onCreate }: ProductSearchBarProps) {
  const { store } = useAuth();
  const search = useProductSearch(store?.id);
  const inputRef = useRef<HTMLInputElement>(null);

  const handleSubmit = (event: FormEvent) => {
    event.preventDefault();
    const first = search.results[0];
    if (first) {
      pick(first);
      return;
    }
    // Offer to create only once a search has actually run and come back empty.
    // Typing a name and hitting Enter faster than the query returns would
    // otherwise offer to create a product that already exists, and the owner
    // would end up with two of them.
    if (search.empty) {
      onCreate(search.query.trim());
    }
  };

  const pick = (product: Product) => {
    onPick(product);
    search.clear();
    inputRef.current?.focus();
  };

  return (
    <div className="border-t border-line-hi bg-body px-4 py-3">
      <form onSubmit={handleSubmit} className="flex gap-2">
        <input
          ref={inputRef}
          type="text"
          autoComplete="off"
          value={search.query}
          onChange={(event) => search.setQuery(event.target.value)}
          placeholder={t("scanner.searchPlaceholder")}
          aria-label={t("scanner.searchPlaceholder")}
          aria-controls="scanner-search-results"
          className="min-w-0 flex-1 rounded-lg border border-line-hi bg-body px-3 py-2.5 text-sm text-onPrimary placeholder:text-body-muted focus:border-primary focus:outline-none"
        />
        <button
          type="submit"
          disabled={search.query.trim().length < 2}
          className="rounded-lg bg-surface/10 px-4 py-2.5 text-sm font-medium text-onPrimary hover:bg-surface/20 disabled:opacity-50"
        >
          <Search className="h-5 w-5" aria-hidden="true" />
          <span className="sr-only">{t("scanner.search")}</span>
        </button>
      </form>

      {search.loading && (
        <p className="px-1 pt-2 text-xs text-body-muted" role="status" aria-live="polite">
          {t("common.loading")}
        </p>
      )}

      {search.query.trim().length === 1 && (
        <p className="px-1 pt-2 text-xs text-body-muted">{t("scanner.searchKeepTyping")}</p>
      )}

      {search.results.length > 0 && (
        <ul id="scanner-search-results" className="mt-2 max-h-64 space-y-1 overflow-y-auto">
          {search.results.map((product) => (
            <li key={product.id}>
              <button
                type="button"
                onClick={() => pick(product)}
                className="flex w-full items-center justify-between gap-3 rounded-lg px-3 py-2.5 text-start text-sm text-onPrimary hover:bg-surface/10"
              >
                <span className="min-w-0 flex-1 truncate">
                  {product.name}
                  <span className="ms-2 text-xs text-body-muted">
                    {unitShort(product.unit)}
                  </span>
                </span>
                <span className="tnum shrink-0 text-sm font-semibold">
                  {fmtMoney(product.sell_price)}
                </span>
              </button>
            </li>
          ))}
        </ul>
      )}

      {search.empty && (
        <button
          type="button"
          onClick={() => onCreate(search.query.trim())}
          className="mt-2 flex w-full items-center gap-2 rounded-lg border border-dashed border-line-hi px-3 py-3 text-start text-sm text-onPrimary hover:bg-surface/10"
        >
          <Plus className="h-4 w-4 shrink-0" aria-hidden="true" />
          {t("scanner.product.createNamed", { name: search.query.trim() })}
        </button>
      )}
    </div>
  );
}
