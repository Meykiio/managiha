import { useCallback, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Camera, CameraOff, ShoppingCart, X } from "lucide-react";
import { BarcodeScanner } from "../components/scanner/BarcodeScanner";
import { CartLines } from "../components/scanner/CartLines";
import { PaymentModal } from "../components/scanner/PaymentModal";
import { ReceiptSummary } from "../components/scanner/ReceiptSummary";
import { ProductSearchBar } from "../components/scanner/ProductSearchBar";
import { ProductFormModal } from "../components/products/ProductFormModal";
import { useBarcodeScanner } from "../hooks/useBarcodeScanner";
import { useBarcodeLookup } from "../hooks/useBarcodeLookup";
import { useScanCart } from "../hooks/useScanCart";
import { useAuth } from "../contexts/AuthContext";
import { fmtMoney } from "../lib/format";
import { t } from "../i18n";
import type { CheckoutItem } from "../lib/checkout";
import type { Product } from "../lib/types";

interface LastSale {
  items: CheckoutItem[];
  totalAmount: number;
  paymentMode: "cash" | "credit";
  amountReceived?: number;
  change?: number;
  customerName?: string;
}

export default function ScannerPage() {
  const navigate = useNavigate();
  const { store } = useAuth();
  const [paymentOpen, setPaymentOpen] = useState(false);
  const [lastSale, setLastSale] = useState<LastSale | null>(null);
  const [receiptOpen, setReceiptOpen] = useState(false);
  const [feedback, setFeedback] = useState<string | null>(null);
  /** Non-null while the create-product form is open; holds the prefilled code. */
  const [createTerm, setCreateTerm] = useState<string | null>(null);

  const cart = useScanCart();
  const lookup = useBarcodeLookup(store?.id);
  const feedbackTimeout = useRef<number | null>(null);

  const showFeedback = useCallback((message: string | null) => {
    if (feedbackTimeout.current) window.clearTimeout(feedbackTimeout.current);
    setFeedback(message);
    if (message) {
      feedbackTimeout.current = window.setTimeout(() => setFeedback(null), 1800);
    }
  }, []);

  const addProductToCart = useCallback(
    (product: Product) => {
      cart.addItem(product);
      showFeedback(`${product.name} · ${fmtMoney(product.sell_price)}`);
    },
    [cart, showFeedback]
  );

  const addToCart = useCallback(
    async (barcode: string) => {
      const product = await lookup.lookup(barcode);
      if (!product) {
        showFeedback(t("scanner.product.notFound"));
        return;
      }
      addProductToCart(product);
    },
    [lookup, addProductToCart, showFeedback]
  );

  const scanner = useBarcodeScanner({ onScan: addToCart });
  const closeScanner = () => scanner.stop();

  /**
   * Creating the product happens here rather than on the products page.
   *
   * The old handoff navigated away with the barcode in the query string, which
   * both lost the cart (it lives in this component) and dropped the intent, since
   * the products page never read the parameters. A cashier adding a missing item
   * mid-sale should never leave the sale.
   */
  const handleProductCreated = (product?: Product) => {
    setCreateTerm(null);
    lookup.reset();
    if (product) addProductToCart(product);
  };

  const handlePaymentSuccess = (sale: LastSale) => {
    setPaymentOpen(false);
    setLastSale(sale);
    setReceiptOpen(true);
    cart.clearCart();
    lookup.reset();
  };

  const totalAmount = cart.items.reduce(
    (sum, item) => sum + item.product.sell_price * item.quantity,
    0
  );

  return (
    <div className="fixed inset-0 z-50 flex flex-col bg-body">
      <header className="flex items-center justify-between bg-body px-4 py-3">
        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={() => {
              closeScanner();
              navigate("/");
            }}
            className="flex h-11 w-11 items-center justify-center rounded-lg text-onPrimary/70 hover:bg-surface/10"
            aria-label={t("common.close")}
          >
            <X className="h-6 w-6" />
          </button>
          <h1 className="text-lg font-semibold text-onPrimary">{t("scanner.title")}</h1>
        </div>
        <button
          type="button"
          onClick={scanner.toggle}
          className="flex h-11 items-center gap-2 rounded-lg bg-surface/10 px-4 text-sm font-medium text-onPrimary hover:bg-surface/20"
        >
          {scanner.isActive ? (
            <>
              <CameraOff className="h-5 w-5" />
              {t("scanner.cameraOff")}
            </>
          ) : (
            <>
              <Camera className="h-5 w-5" />
              {t("scanner.cameraOn")}
            </>
          )}
        </button>
      </header>

      <div className="relative flex-1 overflow-hidden">
        <BarcodeScanner
          isActive={scanner.isActive}
          onDetected={scanner.processBarcode}
          onError={(message) => showFeedback(message)}
        />

        {feedback && (
          <div
            role="status"
            aria-live="polite"
            className="absolute inset-x-4 top-4 z-10 animate-fade-in rounded-lg bg-positive/90 px-4 py-3 text-center text-sm font-medium text-onPrimary shadow-lg"
          >
            {feedback}
          </div>
        )}

        {lookup.status === "loading" && (
          <div className="absolute inset-x-4 top-4 z-10 rounded-lg bg-info/90 px-4 py-3 text-center text-sm font-medium text-onPrimary">
            {t("scanner.lookingUp")}
          </div>
        )}
      </div>

      <ProductSearchBar onPick={addProductToCart} onCreate={setCreateTerm} />

      {lookup.status === "notFound" && (
        <div className="border-t border-line-hi bg-body px-4 py-3">
          <p className="mb-2 text-sm text-body-muted">
            {t("scanner.product.notFoundCode", { code: lookup.barcode ?? "" })}
          </p>
          <button
            type="button"
            onClick={() => setCreateTerm(lookup.barcode ?? "")}
            className="w-full rounded-lg bg-primary-solid py-3 text-sm font-semibold text-onPrimary hover:opacity-90"
          >
            {t("scanner.product.create")}
          </button>
        </div>
      )}

      <div className="flex items-center justify-between border-t border-line-hi bg-body px-4 py-3">
        <div className="flex items-center gap-2 text-onPrimary">
          <ShoppingCart className="h-5 w-5" />
          <span className="text-sm font-medium">
            {cart.totalItems} {t("scanner.items")}
          </span>
        </div>
        <div className="text-lg font-bold text-onPrimary">{fmtMoney(totalAmount)}</div>
      </div>

      {cart.items.length > 0 && (
        <CartLines
          items={cart.items}
          onUpdateQuantity={cart.updateQuantity}
          onRemoveItem={cart.removeItem}
        />
      )}

      {cart.items.length > 0 && (
        <div className="border-t border-line-hi bg-body p-4">
          <button
            type="button"
            onClick={() => setPaymentOpen(true)}
            className="w-full rounded-xl bg-positive py-4 text-center text-lg font-bold text-onPrimary shadow-lg hover:opacity-90"
          >
            {t("scanner.pay")} · {cart.totalItems} {t("scanner.items")} · {fmtMoney(totalAmount)}
          </button>
        </div>
      )}

      <PaymentModal
        open={paymentOpen}
        onClose={() => setPaymentOpen(false)}
        items={cart.items}
        totalAmount={totalAmount}
        onSuccess={handlePaymentSuccess}
      />

      {lastSale && (
        <ReceiptSummary
          open={receiptOpen}
          onClose={() => {
            setReceiptOpen(false);
            setLastSale(null);
          }}
          items={lastSale.items}
          totalAmount={lastSale.totalAmount}
          paymentMode={lastSale.paymentMode}
          amountReceived={lastSale.amountReceived}
          change={lastSale.change}
          customerName={lastSale.customerName}
        />
      )}

      <ProductFormModal
        open={createTerm !== null}
        onClose={() => setCreateTerm(null)}
        initialBarcode={createTerm ?? ""}
        onSaved={handleProductCreated}
      />
    </div>
  );
}