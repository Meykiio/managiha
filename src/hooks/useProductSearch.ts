import { useCallback, useEffect, useState } from "react";
import { searchProducts } from "../lib/api";
import { useDebounced } from "./useDebounced";
import type { Product } from "../lib/types";

export interface ProductSearch {
  query: string;
  setQuery: (value: string) => void;
  results: Product[];
  loading: boolean;
  /** True once a search has run for the current term and found nothing. */
  empty: boolean;
  clear: () => void;
}

/**
 * Type-ahead over names, barcodes and SKUs.
 *
 * Two characters is the floor: a single letter matches most of the shelf and the
 * list is useless. Below that the hook stays quiet rather than querying.
 */
export function useProductSearch(storeId: string | undefined): ProductSearch {
  const [query, setQuery] = useState("");
  const debounced = useDebounced(query);
  const [results, setResults] = useState<Product[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const term = debounced.trim();
    if (!storeId || term.length < 2) {
      setResults([]);
      setLoading(false);
      return;
    }
    let cancelled = false;
    setLoading(true);
    searchProducts(storeId, term)
      .then((rows) => {
        if (!cancelled) setResults(rows);
      })
      .catch(() => {
        if (!cancelled) setResults([]);
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [storeId, debounced]);

  const clear = useCallback(() => {
    setQuery("");
    setResults([]);
  }, []);

  return {
    query,
    setQuery,
    results,
    loading,
    // Only "empty" once the debounced term has caught up with what is typed, so
    // the not-found prompt does not flash while the user is still typing.
    empty: !loading && debounced.trim().length >= 2 && debounced === query && results.length === 0,
    clear,
  };
}
