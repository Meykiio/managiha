import { useState } from "react";
import { PageHeader } from "../../components/ui/PageHeader";
import { Tabs } from "../../components/ui/Tabs";
import LowStockReport from "./LowStockReport";
import StockValueReport from "./StockValueReport";
import MovementsReport from "./MovementsReport";
import CarnetOutstandingReport from "./CarnetOutstandingReport";
import { t } from "../../i18n";

type TabKey = "lowstock" | "stockvalue" | "movements" | "carnet";

export default function ReportsPage() {
  const [tab, setTab] = useState<TabKey>("lowstock");

  return (
    <div className="space-y-5">
      <PageHeader title={t("reports.title")} description={t("reports.subtitle")} />
      <Tabs<TabKey>
        tabs={[
          { key: "lowstock", label: t("reports.tab.lowStock") },
          { key: "stockvalue", label: t("reports.tab.stockValue") },
          { key: "movements", label: t("reports.tab.movements") },
          { key: "carnet", label: t("reports.tab.carnetOutstanding") },
        ]}
        active={tab}
        onChange={(key) => setTab(key)}
      />
      <div>
        {tab === "lowstock" && <LowStockReport />}
        {tab === "stockvalue" && <StockValueReport />}
        {tab === "movements" && <MovementsReport />}
        {tab === "carnet" && <CarnetOutstandingReport />}
      </div>
    </div>
  );
}
