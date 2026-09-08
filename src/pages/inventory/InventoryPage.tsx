import { useSearchParams } from "react-router-dom";
import { PageHeader } from "../../components/ui/PageHeader";
import { Tabs } from "../../components/ui/Tabs";
import { ReceiveStockForm } from "../../components/inventory/ReceiveStockForm";
import { AdjustStockForm } from "../../components/inventory/AdjustStockForm";
import { SellStockForm } from "../../components/inventory/SellStockForm";
import HistoryTab from "./HistoryTab";
import ScannerTab from "./ScannerTab";
import { t } from "../../i18n";

type TabKey = "scanner" | "receive" | "sell" | "adjust" | "history";

export default function InventoryPage() {
  const [searchParams, setSearchParams] = useSearchParams();
  const tab = (searchParams.get("tab") as TabKey) || "scanner";

  const setTab = (key: string) => {
    setSearchParams(key === "scanner" ? {} : { tab: key });
  };

  return (
    <div className="space-y-5">
      <PageHeader title={t("inventory.title")} />
      <Tabs<TabKey>
        tabs={[
          { key: "scanner", label: t("inventory.tab.scanner") },
          { key: "receive", label: t("inventory.tab.receive") },
          { key: "sell", label: t("inventory.tab.sell") },
          { key: "adjust", label: t("inventory.tab.adjust") },
          { key: "history", label: t("inventory.tab.history") },
        ]}
        active={tab}
        onChange={setTab}
      />

      <div className="max-w-2xl space-y-5">
        {tab === "scanner" && (
          <div role="tabpanel" aria-labelledby="tab-scanner" className="rounded-xl border border-neutral-200 bg-white p-5 shadow-card sm:p-6">
            <ScannerTab />
          </div>
        )}
        {tab === "receive" && (
          <div role="tabpanel" aria-labelledby="tab-receive" className="rounded-xl border border-neutral-200 bg-white p-5 shadow-card sm:p-6">
            <ReceiveStockForm />
          </div>
        )}
        {tab === "sell" && (
          <div role="tabpanel" aria-labelledby="tab-sell" className="rounded-xl border border-neutral-200 bg-white p-5 shadow-card sm:p-6">
            <SellStockForm />
          </div>
        )}
        {tab === "adjust" && (
          <div role="tabpanel" aria-labelledby="tab-adjust" className="rounded-xl border border-neutral-200 bg-white p-5 shadow-card sm:p-6">
            <AdjustStockForm />
          </div>
        )}
      </div>

      {tab === "history" && <div role="tabpanel" aria-labelledby="tab-history"><HistoryTab /></div>}
    </div>
  );
}
