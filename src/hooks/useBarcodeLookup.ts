import { useCallback, useRef, useState } from "react";
import { supabase } from "../lib/supabaseClient";
import type { Product } from "../lib/types";

export type LookupStatus = "idle" | "loading" | "found" | "notFound" | "error";

export interface BarcodeLookup {
  status: LookupStatus;
  product: Product | null;
  barcode: string | null;
  lookup: (barcode: string) => Promise<Product | null>;
  reset: () => void;
}

/**
 * Barcode -> product resolution for a single store.
 * Shared by the sell flow and the receive flow so both behave identically.
 * Guards against out-of-order responses when scans arrive faster than the
 * network answers.
 */
export function useBarcodeLookup(storeId: string | undefined): BarcodeLookup {
  const [status, setStatus] = useState<LookupStatus>("idle");
  const [product, setProduct] = useState<Product | null>(null);
  const [barcode, setBarcode] = useState<string | null>(null);
  const requestId = useRef(0);

  const lookup = useCallback(
    async (code: string): Promise<Product | null> => {
      if (!storeId || !code.trim()) return null;
      const id = ++requestId.current;
      setStatus("loading");
      setBarcode(code.trim());

      try {
        const { data, error } = await supabase
          .from("products")
          .select("*")
          .eq("store_id", storeId)
          .eq("barcode", code.trim())
          .eq("active", true)
          .is("archived_at", null)
          .maybeSingle();

        if (id !== requestId.current) return null;

        if (error) {
          setStatus("error");
          setProduct(null);
          return null;
        }

        if (!data) {
          setStatus("notFound");
          setProduct(null);
          return null;
        }

        setStatus("found");
        setProduct(data as Product);
        return data as Product;
      } catch {
        if (id !== requestId.current) return null;
        setStatus("error");
        setProduct(null);
        return null;
      }
    },
    [storeId]
  );

  const reset = useCallback(() => {
    requestId.current++;
    setStatus("idle");
    setProduct(null);
    setBarcode(null);
  }, []);

  return { status, product, barcode, lookup, reset };
}