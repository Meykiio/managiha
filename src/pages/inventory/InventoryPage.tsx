import { useSearchParams } from "react-router-dom";
import { PageHeader } from "../../components/ui/PageHeader";
import { Tabs } from "../../components/ui/Tabs";
import { ReceiveStockForm } from "../../components/inventory/ReceiveStockForm";
import { AdjustStockForm } from "../../components/inventory/AdjustStockForm";
import HistoryTab from "./HistoryTab";
import { t } from "../../i18n";

type TabKey = "receive" | "adjust" | "history";

export default function InventoryPage() {
  const [searchParams, setSearchParams] = useSearchParams();
  const tab = (searchParams.get("tab") as TabKey) || "receive";

  const setTab = (key: string) => {
    setSearchParams(key === "receive" ? {} : { tab: key });
  };

  return (
    <div className="space-y-5">
      <PageHeader title={t("inventory.title")} />
      <Tabs<TabKey>
        tabs={[
          { key: "receive", label: t("inventory.tab.receive") },
          { key: "adjust", label: t("inventory.tab.adjust") },
          { key: "history", label: t("inventory.tab.history") },
        ]}
        active={tab}
        onChange={setTab}
      />

      <div className="max-w-2xl space-y-5">
        {tab === "receive" && (
          <div className="rounded-xl border border-neutral-200 bg-white p-5 shadow-card sm:p-6">
            <ReceiveStockForm />
          </div>
        )}
        {tab === "adjust" && (
          <div className="rounded-xl border border-neutral-200 bg-white p-5 shadow-card sm:p-6">
            <AdjustStockForm />
          </div>
        )}
      </div>

      {tab === "history" && <HistoryTab />}
    </div>
  );
}
