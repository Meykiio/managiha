import { useCallback, useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { AlertTriangle, BookUser, Plus, ScanBarcode } from "lucide-react";
import { supabase } from "../lib/supabaseClient";
import { useAuth } from "../contexts/AuthContext";
import { Button } from "../components/ui/Button";
import { EmptyStoreCard } from "../components/dashboard/EmptyStoreCard";
import { DashboardMetrics } from "../components/dashboard/DashboardMetrics";
import { CreditHero } from "../components/dashboard/CreditHero";
import { NeedsAttention } from "../components/dashboard/NeedsAttention";
import { ExpiryAlert } from "../components/dashboard/ExpiryAlert";
import { MovementFeed } from "../components/dashboard/MovementFeed";
import { CarnetFeed } from "../components/dashboard/CarnetFeed";
import { PageHeader } from "../components/ui/PageHeader";
import { Card } from "../components/ui/Card";
import { ProductFormModal } from "../components/products/ProductFormModal";
import { ReceiveStockModal } from "../components/inventory/ReceiveStockModal";
import { CarnetEntryModal } from "../components/carnet/CarnetEntryModal";
import { fetchDashboardTrends, fetchLowStockProducts } from "../lib/api";
import { fetchExpiryReport } from "../lib/lots";
import type {
  CarnetTransactionWithCustomer,
  DashboardStats,
  DashboardTrendPoint,
  ExpiryRow,
  ProductOverview,
  StockMovementWithProduct,
} from "../lib/types";
import { t } from "../i18n";

export default function DashboardPage() {
  const { store } = useAuth();
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [lowStock, setLowStock] = useState<ProductOverview[]>([]);
  const [movements, setMovements] = useState<StockMovementWithProduct[]>([]);
  const [transactions, setTransactions] = useState<CarnetTransactionWithCustomer[]>([]);
  const [owingCount, setOwingCount] = useState<number | null>(null);
  const [trends, setTrends] = useState<DashboardTrendPoint[]>([]);
  const [expiring, setExpiring] = useState<ExpiryRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [addProductOpen, setAddProductOpen] = useState(false);
  const [receiveOpen, setReceiveOpen] = useState(false);
  const [receiveFor, setReceiveFor] = useState<string | null>(null);
  const [carnetOpen, setCarnetOpen] = useState(false);

  const loadAll = useCallback(async () => {
    if (!store) return;
    setLoading(true);
    setLoadError(null);
    try {
      const [statsRes, movRes, txRes, owingRes] = await Promise.all([
        supabase.rpc("get_dashboard_stats"),
        supabase
          .from("stock_movements")
          .select("*, product:products(id, name, unit)")
          .eq("store_id", store.id)
          .order("created_at", { ascending: false })
          .limit(8),
        supabase
          .from("carnet_transactions")
          .select("*, customer:carnet_customers(id, full_name)")
          .eq("store_id", store.id)
          .order("created_at", { ascending: false })
          .limit(8),
        // head:true returns the count without the rows. Counted here rather than
        // added to get_dashboard_stats because that would need a migration, and
        // migrations 00013-00015 are still unverified against a real database.
        supabase
          .from("carnet_customers")
          .select("id", { count: "exact", head: true })
          .eq("store_id", store.id)
          .gt("balance", 0)
          .is("archived_at", null),
      ]);
      if (statsRes.error) throw new Error(statsRes.error.message);
      if (movRes.error) throw new Error(movRes.error.message);
      if (txRes.error) throw new Error(txRes.error.message);
      if (owingRes.error) throw new Error(owingRes.error.message);
      setStats(statsRes.data as DashboardStats);
      setOwingCount(owingRes.count ?? 0);
      setLowStock(await fetchLowStockProducts(store.id, 10));
      setMovements((movRes.data ?? []) as unknown as StockMovementWithProduct[]);
      setTransactions((txRes.data ?? []) as unknown as CarnetTransactionWithCustomer[]);
      // Trend history is decorative context, so a failure here must not blank the
      // dashboard. The metric cards fall back to an empty series and still render
      // their real values.
      setTrends(await fetchDashboardTrends(14).catch(() => []));
      // Expiring stock belongs on the landing screen: it is the one thing that
      // loses money by being noticed a week late. Same treatment as trends — a
      // failure here must not blank the dashboard.
      setExpiring(await fetchExpiryReport(store.id, 7).catch(() => []));
    } catch (err) {
      setLoadError(err instanceof Error ? err.message : t("common.error"));
    } finally {
      setLoading(false);
    }
  }, [store]);

  useEffect(() => {
    loadAll();
  }, [loadAll]);

  return (
    <div className="space-y-6">
      <PageHeader
        title={t("dash.title")}
        description={store?.name}
        actions={
          <>
            <Link to="/scanner">
              <Button variant="secondary">
                <ScanBarcode className="h-4 w-4" />
                {t("scanner.title")}
              </Button>
            </Link>
            <Button variant="secondary" onClick={() => setAddProductOpen(true)}>
              <Plus className="h-4 w-4" />
              {t("dash.quickAddProduct")}
            </Button>
            <Button onClick={() => setCarnetOpen(true)}>
              <BookUser className="h-4 w-4" />
              {t("dash.quickNewEntry")}
            </Button>
          </>
        }
      />

      {loadError && (
        <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-error bg-error-tint p-4">
          <div className="flex items-start gap-3">
            <AlertTriangle className="mt-0.5 h-5 w-5 shrink-0 text-error-fg" />
            <div>
              <p className="text-sm font-semibold text-error-fg">{t("dash.error.title")}</p>
              <p className="break-words text-xs text-error-fg">{loadError}</p>
            </div>
          </div>
          <Button variant="secondary" onClick={loadAll} loading={loading}>
            {t("common.retry")}
          </Button>
        </div>
      )}

      {!loading && !loadError && stats?.product_count === 0 && (
        <EmptyStoreCard onAddProduct={() => setAddProductOpen(true)} onLoaded={loadAll} />
      )}

      {/* Metrics first, per the design system's layout convention: nav left,
          metrics top, tables below. */}
      <DashboardMetrics stats={stats} trends={trends} loading={loading} />

      <CreditHero
        customerCount={owingCount}
        loading={loading}
        onNewEntry={() => setCarnetOpen(true)}
      />

      <NeedsAttention
        products={lowStock}
        onReceive={(id) => {
          setReceiveFor(id);
          setReceiveOpen(true);
        }}
      />

      {!loading && <ExpiryAlert rows={expiring} />}

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        <Card
          title={t("dash.carnet.title")}
          bodyClassName="px-0 pb-2 pt-1"
          action={
            <Link
              to="/carnet"
              className="-my-1.5 inline-block py-1.5 text-sm font-medium text-primary hover:opacity-80"
            >
              {t("dash.viewAll")}
            </Link>
          }
        >
          <CarnetFeed transactions={transactions} />
        </Card>
        <Card
          title={t("dash.movements.title")}
          bodyClassName="px-0 pb-2 pt-1"
          action={
            <Link
              to="/inventory?tab=history"
              className="-my-1.5 inline-block py-1.5 text-sm font-medium text-primary hover:opacity-80"
            >
              {t("dash.viewAll")}
            </Link>
          }
        >
          <MovementFeed movements={movements} />
        </Card>
      </div>

      <ProductFormModal
        open={addProductOpen}
        onClose={() => setAddProductOpen(false)}
        onSaved={() => loadAll()}
      />
      <ReceiveStockModal
        open={receiveOpen}
        onClose={() => setReceiveOpen(false)}
        presetProductId={receiveFor}
        onSaved={loadAll}
      />
      <CarnetEntryModal open={carnetOpen} onClose={() => setCarnetOpen(false)} onSaved={loadAll} />
    </div>
  );
}
