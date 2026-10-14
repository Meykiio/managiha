import { useSearchParams } from "react-router-dom";
import { PageHeader } from "../../components/ui/PageHeader";
import { Tabs } from "../../components/ui/Tabs";
import LowStockReport from "./LowStockReport";
import StockValueReport from "./StockValueReport";
import MovementsReport from "./MovementsReport";
import CarnetOutstandingReport from "./CarnetOutstandingReport";
import ExpiryReport from "./ExpiryReport";
import SalesReport from "./SalesReport";
import ReorderReport from "./ReorderReport";
import { t } from "../../i18n";

type TabKey = "lowstock" | "sales" | "reorder" | "stockvalue" | "movements" | "expiry" | "carnet";

const TAB_KEYS: TabKey[] = [
  "lowstock",
  "sales",
  "reorder",
  "stockvalue",
  "movements",
  "expiry",
  "carnet",
];

function isTabKey(value: string | null): value is TabKey {
  return value != null && (TAB_KEYS as string[]).includes(value);
}

/**
 * The open tab lives in the URL.
 *
 * It used to be component state, which meant the dashboard's "see what expires"
 * link landed on whatever tab happened to be first. A link to a specific report is
 * only a link if the report is addressable.
 */
export default function ReportsPage() {
  const [params, setParams] = useSearchParams();
  const requested = params.get("tab");
  const tab: TabKey = isTabKey(requested) ? requested : "lowstock";

  const setTab = (key: TabKey) => {
    const next = new URLSearchParams(params);
    next.set("tab", key);
    setParams(next, { replace: true });
  };

  return (
    <div className="space-y-5">
      <PageHeader title={t("reports.title")} description={t("reports.subtitle")} />
      <Tabs<TabKey>
        tabs={[
          { key: "lowstock", label: t("reports.tab.lowStock") },
          { key: "sales", label: t("reports.tab.sales") },
          { key: "reorder", label: t("reports.tab.reorder") },
          { key: "stockvalue", label: t("reports.tab.stockValue") },
          { key: "movements", label: t("reports.tab.movements") },
          { key: "expiry", label: t("reports.tab.expiry") },
          { key: "carnet", label: t("reports.tab.carnetOutstanding") },
        ]}
        active={tab}
        onChange={setTab}
      />
      <div>
        {tab === "lowstock" && <LowStockReport />}
        {tab === "sales" && <SalesReport />}
        {tab === "reorder" && <ReorderReport />}
        {tab === "stockvalue" && <StockValueReport />}
        {tab === "movements" && <MovementsReport />}
        {tab === "expiry" && <ExpiryReport />}
        {tab === "carnet" && <CarnetOutstandingReport />}
      </div>
    </div>
  );
}
