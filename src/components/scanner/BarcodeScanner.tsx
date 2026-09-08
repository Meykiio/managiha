import { useEffect, useRef } from "react";
import { Html5Qrcode } from "html5-qrcode";
import { Camera, CameraOff } from "lucide-react";
import { t } from "../../i18n";

interface BarcodeScannerProps {
  isActive: boolean;
  onDetected: (barcode: string) => void;
  onError?: (error: string) => void;
}

const SCANNER_ID = "barcode-scanner-region";

export function BarcodeScanner({
  isActive,
  onDetected,
  onError,
}: BarcodeScannerProps) {
  const scannerRef = useRef<Html5Qrcode | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const cancelledRef = useRef(false);

  useEffect(() => {
    cancelledRef.current = false;

    if (!isActive) {
      scannerRef.current?.stop().catch(() => {});
      scannerRef.current = null;
      return;
    }

    if (!containerRef.current) return;

    const scanner = new Html5Qrcode(SCANNER_ID);
    scannerRef.current = scanner;

    scanner
      .start(
        { facingMode: "environment" },
        {
          fps: 10,
          qrbox: { width: 250, height: 250 },
          aspectRatio: 1,
        },
        (decodedText) => {
          if (!cancelledRef.current) {
            onDetected(decodedText);
          }
        },
        () => {}
      )
      .then(() => {
        // If cancelled while starting, stop immediately
        if (cancelledRef.current) {
          scanner.stop().catch(() => {});
          scannerRef.current = null;
        }
      })
      .catch((err: unknown) => {
        if (cancelledRef.current) return;
        const msg =
          typeof err === "string"
            ? err
            : err instanceof Error
              ? err.message
              : t("scanner.error");
        onError?.(msg);
      });

    return () => {
      cancelledRef.current = true;
      scanner.stop().catch(() => {});
      scanner.clear();
      scannerRef.current = null;
    };
  }, [isActive, onDetected, onError]);

  return (
    <div className="relative overflow-hidden rounded-xl bg-neutral-900">
      <div
        ref={containerRef}
        id={SCANNER_ID}
        className="min-h-[250px] w-full"
      />
      {isActive && (
        <div className="pointer-events-none absolute inset-0 flex items-center justify-center">
          <div className="h-[250px] w-[250px] rounded-xl border-2 border-white/20" />
        </div>
      )}
      {!isActive && (
        <div className="flex min-h-[250px] flex-col items-center justify-center gap-3 text-white">
          <CameraOff size={40} className="text-white/40" />
          <p className="text-sm text-white/60">{t("scanner.cameraOff")}</p>
        </div>
      )}
    </div>
  );
}
