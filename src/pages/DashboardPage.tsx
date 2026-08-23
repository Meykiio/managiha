import { useCallback, useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { AlertTriangle, BookUser, Coins, Plus, Wallet, XCircle } from "lucide-react";
import { supabase } from "../lib/supabaseClient";
import { useAuth } from "../contexts/AuthContext";
import { Button } from "../components/ui/Button";
import { Card } from "../components/ui/Card";
import { EmptyState } from "../components/ui/EmptyState";
import { PageHeader } from "../components/ui/PageHeader";
import { StatCard } from "../components/ui/StatCard";
import { Badge, stockStatusTone } from "../components/ui/Badge";
import { ProductFormModal } from "../components/products/ProductFormModal";
import { ReceiveStockModal } from "../components/inventory/ReceiveStockModal";
import { CarnetEntryModal } from "../components/carnet/CarnetEntryModal";
import { MovementFeed } from "../components/dashboard/MovementFeed";
import { CarnetFeed } from "../components/dashboard/CarnetFeed";
import { fetchLowStockProducts } from "../lib/api";
import type {
  CarnetTransactionWithCustomer,
  DashboardStats,
  ProductOverview,
  StockMovementWithProduct,
} from "../lib/types";
import { fmtMoneyShort, fmtQty } from "../lib/format";
import { t } from "../i18n";

const STATUS_LABEL = {
  healthy: "",
  low: t("products.status.low"),
  out: t("products.status.out"),
};

export default function DashboardPage() {
  const { store } = useAuth();
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [lowStock, setLowStock] = useState<ProductOverview[]>([]);
  const [movements, setMovements] = useState<StockMovementWithProduct[]>([]);
  const [transactions, setTransactions] = useState<CarnetTransactionWithCustomer[]>([]);
  const [loading, setLoading] = useState(true);
  const [addProductOpen, setAddProductOpen] = useState(false);
  const [receiveOpen, setReceiveOpen] = useState(false);
  const [receiveFor, setReceiveFor] = useState<string | null>(null);
  const [carnetOpen, setCarnetOpen] = useState(false);

  const loadAll = useCallback(async () => {
    if (!store) return;
    setLoading(true);
    try {
      const [statsRes, movRes, txRes] = await Promise.all([
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
      ]);
      if (statsRes.error) throw new Error(statsRes.error.message);
      if (movRes.error) throw new Error(movRes.error.message);
      if (txRes.error) throw new Error(txRes.error.message);
      setStats(statsRes.data as DashboardStats);
      setLowStock(await fetchLowStockProducts(store.id, 10));
      setMovements((movRes.data ?? []) as unknown as StockMovementWithProduct[]);
      setTransactions((txRes.data ?? []) as unknown as CarnetTransactionWithCustomer[]);
    } catch {
      setStats({ stock_value: 0, low_count: 0, out_count: 0, carnet_total: 0 });
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
            <Button onClick={() => setAddProductOpen(true)}>
              <Plus className="h-4 w-4" />
              {t("dash.quickAddProduct")}
            </Button>
            <Button variant="secondary" onClick={() => setCarnetOpen(true)}>
              <BookUser className="h-4 w-4" />
              {t("dash.quickNewEntry")}
            </Button>
          </>
        }
      />

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard
          icon={Coins}
          label={t("dash.kpi.stockValue")}
          value={stats ? fmtMoneyShort(stats.stock_value) : "—"}
          loading={loading}
          tone="info"
        />
        <StatCard
          icon={AlertTriangle}
          label={t("dash.kpi.lowStock")}
          value={stats ? String(stats.low_count) : "—"}
          loading={loading}
          tone="warning"
        />
        <StatCard
          icon={XCircle}
          label={t("dash.kpi.outOfStock")}
          value={stats ? String(stats.out_count) : "—"}
          loading={loading}
          tone="danger"
        />
        <StatCard
          icon={Wallet}
          label={t("dash.kpi.carnetTotal")}
          value={stats ? fmtMoneyShort(stats.carnet_total) : "—"}
          loading={loading}
          tone="success"
        />
      </div>

      <Card title={t("dash.lowStock.title")} bodyClassName="px-0 pb-2 pt-1">
        {lowStock.length === 0 ? (
          <EmptyState compact icon={AlertTriangle} title={t("dash.empty.lowStock")} body="" />
        ) : (
          <ul className="divide-y divide-neutral-100">
            {lowStock.map((p) => (
              <li key={p.id} className="flex flex-wrap items-center gap-x-4 gap-y-2 px-5 py-3">
                <Link
                  to={`/products/${p.id}`}
                  className="min-w-0 flex-1 truncate text-sm font-medium text-neutral-900 hover:text-primary-700"
                >
                  {p.name}
                </Link>
                <Badge tone={stockStatusTone(p.stock_status)} dot>
                  {STATUS_LABEL[p.stock_status]}
                </Badge>
                <span className="tnum text-end text-sm text-neutral-600">
                  {fmtQty(p.current_stock)} / {fmtQty(Number(p.low_stock_threshold ?? 0))}
                </span>
                <Button
                  variant="secondary"
                  onClick={() => {
                    setReceiveFor(p.id);
                    setReceiveOpen(true);
                  }}
                >
                  {t("dash.lowStock.receive")}
                </Button>
              </li>
            ))}
          </ul>
        )}
      </Card>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        <Card title={t("dash.movements.title")} bodyClassName="px-0 pb-2 pt-1">
          <MovementFeed movements={movements} />
        </Card>
        <Card title={t("dash.carnet.title")} bodyClassName="px-0 pb-2 pt-1">
          <CarnetFeed transactions={transactions} />
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
