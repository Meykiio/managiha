import { useSearchParams } from "react-router-dom";
import type { TranslationKey } from "../../i18n";
import { PageHeader } from "../../components/ui/PageHeader";
import { Tabs } from "../../components/ui/Tabs";
import { ReceiveStockForm } from "../../components/inventory/ReceiveStockForm";
import { AdjustStockForm } from "../../components/inventory/AdjustStockForm";
import { SellStockForm } from "../../components/inventory/SellStockForm";
import { StockCountTab } from "../../components/inventory/StockCountTab";
import HistoryTab from "./HistoryTab";
import { t } from "../../i18n";

type TabKey = "receive" | "count" | "sell" | "adjust" | "history";

/**
 * Keys, not labels. These used to hold `label: t(...)` at module scope, which
 * froze the tab names in the language active at import and left this page in
 * French after switching to Arabic. See the architecture guard test.
 */
const TABS: { key: TabKey; labelKey: TranslationKey }[] = [
  { key: "receive", labelKey: "inventory.tab.receive" },
  { key: "count", labelKey: "inventory.tab.count" },
  { key: "sell", labelKey: "inventory.tab.sell" },
  { key: "adjust", labelKey: "inventory.tab.adjust" },
  { key: "history", labelKey: "inventory.tab.history" },
];

function TabPanel({ id, children }: { id: TabKey; children: React.ReactNode }) {
  return (
    <div
      id={`tab-panel-${id}`}
      role="tabpanel"
      aria-labelledby={`tab-${id}`}
      tabIndex={0}
      className="rounded-xl border border-line bg-surface p-5 shadow-card sm:p-6 focus:outline-none focus-visible:ring-2 focus-visible:ring-primary"
    >
      {children}
    </div>
  );
}

export default function InventoryPage() {
  const [searchParams, setSearchParams] = useSearchParams();
  const requested = searchParams.get("tab") as TabKey | null;
  const tab: TabKey = TABS.some((entry) => entry.key === requested)
    ? (requested as TabKey)
    : "receive";

  return (
    <div className="space-y-5">
      <PageHeader title={t("inventory.title")} />
      <Tabs<TabKey>
        tabs={TABS.map((entry) => ({ key: entry.key, label: t(entry.labelKey) }))}
        active={tab}
        onChange={(key) => setSearchParams({ tab: key })}
      />

      <div className="max-w-2xl space-y-5">
        {tab === "receive" && (
          <TabPanel id="receive">
            <ReceiveStockForm />
          </TabPanel>
        )}
        {tab === "count" && <StockCountTab />}
        {tab === "sell" && (
          <TabPanel id="sell">
            <SellStockForm />
          </TabPanel>
        )}
        {tab === "adjust" && (
          <TabPanel id="adjust">
            <AdjustStockForm />
          </TabPanel>
        )}
        {tab === "history" && <HistoryTab />}
      </div>
    </div>
  );
}