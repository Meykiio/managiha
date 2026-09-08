import { useCallback, useRef, useState } from "react";
import { Camera, CameraOff, ShoppingCart } from "lucide-react";
import { BarcodeScanner } from "../../components/scanner/BarcodeScanner";
import { ScanCart } from "../../components/scanner/ScanCart";
import { ScanResult } from "../../components/scanner/ScanResult";
import { PaymentModal } from "../../components/scanner/PaymentModal";
import { ReceiptSummary } from "../../components/scanner/ReceiptSummary";
import { useBarcodeScanner } from "../../hooks/useBarcodeScanner";
import { useScanCart } from "../../hooks/useScanCart";
import { useAuth } from "../../contexts/AuthContext";
import { supabase } from "../../lib/supabaseClient";
import { t } from "../../i18n";
import type { Product } from "../../lib/types";
import type { CheckoutItem } from "../../lib/checkout";

interface LastSale {
  items: CheckoutItem[];
  totalAmount: number;
  paymentMode: "cash" | "credit";
  amountReceived?: number;
  change?: number;
  customerName?: string;
}

export default function ScannerTab() {
  const { store } = useAuth();
  const storeId = store?.id;
  const [manualBarcode, setManualBarcode] = useState("");
  const [lastScannedBarcode, setLastScannedBarcode] = useState<string | null>(null);
  const [scannedProduct, setScannedProduct] = useState<Product | null>(null);
  const [isLookingUp, setIsLookingUp] = useState(false);
  const [actionError, setActionError] = useState<string | null>(null);
  const [actionSuccess, setActionSuccess] = useState<string | null>(null);
  const [paymentOpen, setPaymentOpen] = useState(false);
  const [lastSale, setLastSale] = useState<LastSale | null>(null);
  const [receiptOpen, setReceiptOpen] = useState(false);

  const cart = useScanCart();
  const lookupIdRef = useRef(0);

  const lookupProduct = useCallback(
    async (barcode: string) => {
      if (!storeId) return;
      const lookupId = ++lookupIdRef.current;
      setIsLookingUp(true);
      setActionError(null);
      setActionSuccess(null);
      setLastScannedBarcode(barcode);

      try {
        const { data, error } = await supabase
          .from("products")
          .select("*")
          .eq("store_id", storeId)
          .eq("barcode", barcode)
          .eq("active", true)
          .is("archived_at", null)
          .single();

        // Only update state if this is still the latest lookup
        if (lookupId !== lookupIdRef.current) return;

        if (error || !data) {
          setScannedProduct(null);
        } else {
          setScannedProduct(data as Product);
        }
      } catch {
        if (lookupId !== lookupIdRef.current) return;
        setScannedProduct(null);
      } finally {
        if (lookupId === lookupIdRef.current) {
          setIsLookingUp(false);
        }
      }
    },
    [storeId]
  );

  const handleScan = useCallback(
    (barcode: string) => {
      lookupProduct(barcode);
    },
    [lookupProduct]
  );

  const scanner = useBarcodeScanner({
    onScan: handleScan,
    cooldownMs: 2000,
  });

  const handleManualSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (manualBarcode.trim()) {
      handleScan(manualBarcode.trim());
      setManualBarcode("");
    }
  };

  const handleAddToCart = (product: Product) => {
    cart.addItem(product);
    setScannedProduct(null);
    setLastScannedBarcode(null);
    setActionSuccess(t("scanner.action.added", { name: product.name }));
    setTimeout(() => setActionSuccess(null), 2000);
  };

  const handleCreateNew = (barcode: string) => {
    window.location.href = `/products?create=true&barcode=${encodeURIComponent(barcode)}`;
  };

  const handleDismiss = () => {
    setScannedProduct(null);
    setLastScannedBarcode(null);
  };

  const handlePaymentSuccess = (sale: LastSale) => {
    setPaymentOpen(false);
    setLastSale(sale);
    setReceiptOpen(true);
    cart.clearCart();
  };

  const handleReceiptClose = () => {
    setReceiptOpen(false);
    setLastSale(null);
    setActionSuccess(t("scanner.action.sellSuccess"));
    setTimeout(() => setActionSuccess(null), 3000);
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <ShoppingCart size={18} className="text-blue-600" />
          <span className="text-sm font-medium text-neutral-700">
            {t("scanner.title")}
          </span>
        </div>
        <button
          type="button"
          onClick={scanner.toggle}
          className={`inline-flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-medium transition ${
            scanner.isActive
              ? "bg-blue-600 text-white hover:bg-blue-700"
              : "bg-neutral-100 text-neutral-600 hover:bg-neutral-200"
          }`}
        >
          {scanner.isActive ? (
            <>
              <CameraOff size={14} />
              {t("scanner.cameraOff")}
            </>
          ) : (
            <>
              <Camera size={14} />
              {t("scanner.cameraOn")}
            </>
          )}
        </button>
      </div>

      <BarcodeScanner
        isActive={scanner.isActive}
        onDetected={scanner.processBarcode}
        onError={scanner.setError}
      />

      {scanner.error && (
        <p className="rounded-lg bg-red-50 px-3 py-2 text-xs text-red-600">
          {scanner.error}
        </p>
      )}

      <form onSubmit={handleManualSubmit} className="flex gap-2">
        <input
          type="text"
          value={manualBarcode}
          onChange={(e) => setManualBarcode(e.target.value)}
          placeholder={t("scanner.manualPlaceholder")}
          className="flex-1 rounded-lg border border-neutral-300 px-3 py-2.5 text-sm placeholder:text-neutral-400 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
        />
        <button
          type="submit"
          disabled={!manualBarcode.trim()}
          className="rounded-lg bg-neutral-100 px-4 py-2.5 text-sm font-medium text-neutral-700 hover:bg-neutral-200 disabled:opacity-50"
        >
          {t("scanner.search")}
        </button>
      </form>

      {isLookingUp && (
        <p className="text-center text-sm text-neutral-500">
          {t("scanner.lookingUp")}
        </p>
      )}

      {lastScannedBarcode && !isLookingUp && (
        <ScanResult
          product={scannedProduct}
          barcode={lastScannedBarcode}
          onAddToCart={handleAddToCart}
          onCreateNew={handleCreateNew}
          onDismiss={handleDismiss}
        />
      )}

      {actionError && (
        <p className="rounded-lg bg-red-50 px-3 py-2 text-xs text-red-600">
          {actionError}
        </p>
      )}
      {actionSuccess && (
        <p className="rounded-lg bg-green-50 px-3 py-2 text-xs text-green-600">
          {actionSuccess}
        </p>
      )}

      <div className="border-t border-neutral-200 pt-4">
        <ScanCart
          items={cart.items}
          totalItems={cart.totalItems}
          totalAmount={cart.totalAmount}
          onUpdateQuantity={cart.updateQuantity}
          onRemoveItem={cart.removeItem}
        />
      </div>

      {cart.items.length > 0 && (
        <button
          type="button"
          onClick={() => setPaymentOpen(true)}
          className="w-full rounded-lg bg-blue-600 px-4 py-3 text-sm font-medium text-white hover:bg-blue-700"
        >
          {t("scanner.pay")} · {cart.totalItems} {t("scanner.items")} ·{" "}
          {cart.totalAmount.toFixed(2)} DZD
        </button>
      )}

      <PaymentModal
        open={paymentOpen}
        onClose={() => setPaymentOpen(false)}
        items={cart.items}
        totalAmount={cart.totalAmount}
        onSuccess={handlePaymentSuccess}
      />

      {lastSale && (
        <ReceiptSummary
          open={receiptOpen}
          onClose={handleReceiptClose}
          items={lastSale.items}
          totalAmount={lastSale.totalAmount}
          paymentMode={lastSale.paymentMode}
          amountReceived={lastSale.amountReceived}
          change={lastSale.change}
          customerName={lastSale.customerName}
        />
      )}
    </div>
  );
}
