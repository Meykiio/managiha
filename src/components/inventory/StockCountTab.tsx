import { useState, type FormEvent } from "react";
import { Check, ClipboardList, ScanBarcode, Trash2 } from "lucide-react";
import { useAuth } from "../../contexts/AuthContext";
import { useToast } from "../../contexts/ToastContext";
import { Button } from "../ui/Button";
import { Input } from "../ui/Input";
import { useProductSearch } from "../../hooks/useProductSearch";
import { callAdjustStock } from "../../lib/api";
import { newOperationId } from "../../lib/ids";
import { submitOrQueue } from "../../lib/offline/submit";
import { fmtQty } from "../../lib/format";
import { unitShort } from "../../lib/constants";
import { cn } from "../../lib/utils";
import type { Product } from "../../lib/types";
import { t } from "../../i18n";

interface CountLine {
  product: Product;
  counted: string;
}

/**
 * Counting the shelf, product by product.
 *
 * The server already had everything this needs: `count_adjustment` takes an
 * ABSOLUTE counted quantity and computes the delta itself, under a row lock, so
 * the browser never decides what the stock becomes. What was missing was a way to
 * do it for more than one product without opening a dialog forty times.
 *
 * The design follows the job. You stand in front of the shelf with the phone, so
 * the search accepts a name or a scanned barcode, each product is added once, and
 * nothing is written until you press the button. A count is a physical act you
 * may abandon halfway, so the session lives in component state and leaving the
 * tab discards it.
 *
 * Each line is submitted as its own movement rather than one bulk call, because
 * each is a separate physical correction with its own immutable record. They go
 * through submitOrQueue, so a count taken in a dead zone is not lost.
 */
export function StockCountTab() {
  const { store } = useAuth();
  const { showToast } = useToast();
  const search = useProductSearch(store?.id);
  const [lines, setLines] = useState<CountLine[]>([]);
  const [saving, setSaving] = useState(false);

  const addProduct = (product: Product) => {
    setLines((prev) =>
      prev.some((l) => l.product.id === product.id)
        ? prev
        : [...prev, { product, counted: "" }]
    );
    search.clear();
  };

  const setCounted = (productId: string, value: string) => {
    setLines((prev) =>
      prev.map((l) => (l.product.id === productId ? { ...l, counted: value } : l))
    );
  };

  const removeLine = (productId: string) => {
    setLines((prev) => prev.filter((l) => l.product.id !== productId));
  };

  const parseCount = (raw: string): number | null => {
    if (raw.trim() === "") return null;
    const n = Number(raw.replace(",", "."));
    return Number.isNaN(n) || n < 0 ? null : n;
  };

  /** Lines with a valid count that actually differs from what the system holds. */
  const pending = lines.filter((l) => {
    const counted = parseCount(l.counted);
    return counted !== null && counted !== Number(l.product.current_stock);
  });

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    if (pending.length === 0) return;
    setSaving(true);
    let queued = 0;
    try {
      for (const line of pending) {
        const counted = parseCount(line.counted);
        if (counted === null) continue;
        const opId = newOperationId();
        const input = {
          productId: line.product.id,
          movementType: "count_adjustment" as const,
          // The counted total, not the difference. The server computes the delta
          // under a row lock; sending a delta from here would be a race.
          quantity: counted,
          reason: "inventory_count",
          clientOpId: opId,
        };
        const outcome = await submitOrQueue("adjust_stock", opId, input, () =>
          callAdjustStock(input)
        );
        if (outcome === "queued") queued += 1;
      }
      showToast(
        queued > 0
          ? t("toast.countQueued", { count: queued })
          : t("toast.countSaved", { count: pending.length })
      );
      setLines([]);
    } catch (err) {
      showToast(err instanceof Error ? err.message : t("common.error"), "error");
    } finally {
      setSaving(false);
    }
  };

  const handleSearchSubmit = (e: FormEvent) => {
    e.preventDefault();
    const first = search.results[0];
    if (first) addProduct(first);
  };

  const variance = (line: CountLine): number | null => {
    const counted = parseCount(line.counted);
    return counted === null ? null : counted - Number(line.product.current_stock);
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-5">
      <p className="text-sm text-body-soft">{t("inventory.count.intro")}</p>

      <div>
        <div className="flex gap-2">
          <Input
            value={search.query}
            onChange={(e) => search.setQuery(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") {
                e.preventDefault();
                const first = search.results[0];
                if (first) addProduct(first);
              }
            }}
            placeholder={t("inventory.count.searchPlaceholder")}
            prefixIcon={<ScanBarcode className="h-4 w-4" />}
            aria-label={t("inventory.count.searchPlaceholder")}
            className="flex-1"
          />
          <Button type="button" variant="secondary" onClick={handleSearchSubmit}>
            {t("common.add")}
          </Button>
        </div>

        {search.loading && (
          <p className="mt-2 text-xs text-body-muted" role="status" aria-live="polite">
            {t("common.loading")}
          </p>
        )}

        {search.results.length > 0 && (
          <ul className="mt-2 divide-y divide-line rounded-xl border border-line">
            {search.results.slice(0, 6).map((p) => (
              <li key={p.id}>
                <button
                  type="button"
                  onClick={() => addProduct(p)}
                  className="flex w-full items-center justify-between gap-3 px-3.5 py-2.5 text-start text-sm hover:bg-surface-mid"
                >
                  <span className="truncate text-body">{p.name}</span>
                  <span className="tnum shrink-0 text-xs text-body-muted">
                    {fmtQty(p.current_stock)} {unitShort(p.unit)}
                  </span>
                </button>
              </li>
            ))}
          </ul>
        )}
      </div>

      {lines.length === 0 ? (
        <div className="rounded-xl border border-dashed border-line py-10 text-center">
          <ClipboardList className="mx-auto h-6 w-6 text-body-muted" aria-hidden="true" />
          <p className="mt-2 text-sm text-body-muted">{t("inventory.count.empty")}</p>
        </div>
      ) : (
        <ul className="divide-y divide-line rounded-xl border border-line">
          {lines.map((line) => {
            const v = variance(line);
            return (
              <li key={line.product.id} className="flex flex-wrap items-center gap-3 px-3.5 py-3">
                <span className="min-w-0 flex-1 truncate text-sm font-medium text-body">
                  {line.product.name}
                </span>
                <span className="tnum shrink-0 text-xs text-body-muted">
                  {t("inventory.count.expected")} {fmtQty(line.product.current_stock)}
                </span>
                <input
                  type="number"
                  inputMode="decimal"
                  step="any"
                  min="0"
                  value={line.counted}
                  onChange={(e) => setCounted(line.product.id, e.target.value)}
                  placeholder={t("inventory.count.counted")}
                  aria-label={`${t("inventory.count.counted")} — ${line.product.name}`}
                  className="h-10 w-24 rounded-lg border border-line-hi bg-surface px-2.5 text-end text-sm text-body focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary-tint"
                />
                <span
                  className={cn(
                    "tnum w-16 text-end text-xs font-medium",
                    v === null || v === 0
                      ? "text-body-muted"
                      : v > 0
                        ? "text-positive-fg"
                        : "text-error-fg"
                  )}
                >
                  {v === null ? "—" : v > 0 ? `+${fmtQty(v)}` : fmtQty(v)}
                </span>
                <button
                  type="button"
                  onClick={() => removeLine(line.product.id)}
                  aria-label={`${t("common.remove")} — ${line.product.name}`}
                  className="text-body-muted hover:text-error-fg"
                >
                  <Trash2 className="h-4 w-4" />
                </button>
              </li>
            );
          })}
        </ul>
      )}

      {lines.length > 0 && (
        <div className="flex flex-wrap items-center justify-between gap-3">
          <p className="text-xs text-body-muted">
            {t("inventory.count.summary", {
              counted: lines.length,
              changed: pending.length,
            })}
          </p>
          <Button type="submit" loading={saving} disabled={pending.length === 0}>
            <Check className="h-4 w-4" aria-hidden="true" />
            {t("inventory.count.submit", { count: pending.length })}
          </Button>
        </div>
      )}
    </form>
  );
}
