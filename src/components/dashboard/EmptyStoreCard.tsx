import { useState } from "react";
import { PackageOpen, Sparkles } from "lucide-react";
import { useAuth } from "../../contexts/AuthContext";
import { useToast } from "../../contexts/ToastContext";
import { Button } from "../ui/Button";
import { Card } from "../ui/Card";
import { loadSampleData } from "../../lib/sampleData";
import { t } from "../../i18n";

interface EmptyStoreCardProps {
  onAddProduct: () => void;
  onLoaded: () => void;
}

export function EmptyStoreCard({ onAddProduct, onLoaded }: EmptyStoreCardProps) {
  const { store } = useAuth();
  const { showToast } = useToast();
  const [loading, setLoading] = useState(false);

  const handleLoadSample = async () => {
    if (!store) return;
    setLoading(true);
    try {
      await loadSampleData(store);
      showToast(t("toast.sampleDataLoaded"));
      onLoaded();
    } catch (err) {
      showToast(err instanceof Error ? err.message : t("common.error"), "error");
    } finally {
      setLoading(false);
    }
  };

  return (
    <Card>
      <div className="flex flex-col items-center gap-3 py-6 text-center">
        <span className="flex h-12 w-12 items-center justify-center rounded-full bg-primary-50">
          <PackageOpen className="h-6 w-6 text-primary-600" />
        </span>
        <div>
          <p className="text-sm font-semibold text-neutral-900">{t("dash.emptyStore.title")}</p>
          <p className="mx-auto mt-1 max-w-sm text-sm text-neutral-500">
            {t("dash.emptyStore.body")}
          </p>
        </div>
        <div className="flex flex-wrap justify-center gap-3">
          <Button variant="secondary" onClick={onAddProduct}>
            {t("dash.quickAddProduct")}
          </Button>
          <Button onClick={handleLoadSample} loading={loading}>
            <Sparkles className="h-4 w-4" />
            {t("dash.emptyStore.sample")}
          </Button>
        </div>
      </div>
    </Card>
  );
}