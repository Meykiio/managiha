import { AlertTriangle } from "lucide-react";
import { Link } from "react-router-dom";
import { Button } from "../ui/Button";
import { Card } from "../ui/Card";
import { EmptyState } from "../ui/EmptyState";
import { Badge, stockStatusTone } from "../ui/Badge";
import { fmtQty } from "../../lib/format";
import { t } from "../../i18n";
import type { ProductOverview } from "../../lib/types";

interface NeedsAttentionProps {
  products: ProductOverview[];
  onReceive: (productId: string) => void;
}

/**
 * The second differentiator, and the only other thing on the page that prompts
 * an action: products at or below their threshold, each with the Receive button
 * already attached so acting is one click rather than a navigation.
 */
export function NeedsAttention({ products, onReceive }: NeedsAttentionProps) {
  return (
    <Card title={t("dash.lowStock.title")} bodyClassName="px-0 pb-2 pt-1">
      {products.length === 0 ? (
        <EmptyState compact icon={AlertTriangle} title={t("dash.empty.lowStock")} body="" />
      ) : (
        <ul className="divide-y divide-line">
          {products.map((p) => (
            <li key={p.id} className="flex flex-wrap items-center gap-x-4 gap-y-2 px-5 py-3">
              <Link
                to={`/products/${p.id}`}
                className="min-w-0 flex-1 truncate text-sm font-medium text-body hover:opacity-80"
              >
                {p.name}
              </Link>
              <Badge tone={stockStatusTone(p.stock_status)} dot>
                {p.stock_status === "out"
                  ? t("products.status.out")
                  : t("products.status.low")}
              </Badge>
              <span className="tnum text-end text-sm text-body-soft">
                {fmtQty(p.current_stock)} / {fmtQty(Number(p.low_stock_threshold ?? 0))}
              </span>
              <Button variant="secondary" onClick={() => onReceive(p.id)}>
                {t("dash.lowStock.receive")}
              </Button>
            </li>
          ))}
        </ul>
      )}
    </Card>
  );
}