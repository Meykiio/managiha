import { useCallback, useEffect, useRef, useState } from "react";

interface UseBarcodeScannerOptions {
  onScan: (barcode: string) => void;
  cooldownMs?: number;
}

export function useBarcodeScanner({
  onScan,
  cooldownMs = 2000,
}: UseBarcodeScannerOptions) {
  const [isActive, setIsActive] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const lastScanRef = useRef<Map<string, number>>(new Map());

  const processBarcode = useCallback(
    (barcode: string) => {
      const now = Date.now();
      const lastScan = lastScanRef.current.get(barcode);
      if (lastScan && now - lastScan < cooldownMs) return;
      lastScanRef.current.set(barcode, now);
      onScan(barcode);
    },
    [onScan, cooldownMs]
  );

  const start = useCallback(() => {
    setIsActive(true);
    setError(null);
  }, []);

  const stop = useCallback(() => {
    setIsActive(false);
  }, []);

  const toggle = useCallback(() => {
    setIsActive((prev) => !prev);
  }, []);

  useEffect(() => {
    return () => {
      lastScanRef.current.clear();
    };
  }, []);

  return { isActive, error, setError, start, stop, toggle, processBarcode };
}
