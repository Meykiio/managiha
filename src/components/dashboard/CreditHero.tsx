import { ArrowRight, BookUser, Users } from "lucide-react";
import { Link } from "react-router-dom";
import { Button } from "../ui/Button";
import { t } from "../../i18n";

interface CreditHeroProps {
  /** How many customers have a positive balance. */
  customerCount: number | null;
  loading: boolean;
  onNewEntry: () => void;
}

/**
 * The credit action strip.
 *
 * The headline money figure now lives in the metric row above, where it carries a
 * delta and a sparkline like every other metric. This strip is what remains: the
 * two things a shopkeeper actually does about credit, plus the count that makes
 * the number concrete.
 *
 * Counted customers, not total customers: "412 customers" flatters a shop with
 * 12. "3 of your customers owe you" is the actual situation.
 */
export function CreditHero({ customerCount, loading, onNewEntry }: CreditHeroProps) {
  const settled = !loading && customerCount === 0;

  return (
    <section
      aria-labelledby="credit-hero-heading"
      className="overflow-hidden rounded-2xl border border-warning bg-gradient-to-b from-warning-tint to-surface"
    >
      <div className="flex flex-col gap-5 p-5 sm:flex-row sm:items-center sm:justify-between sm:p-6">
        <div className="min-w-0">
          <h2
            id="credit-hero-heading"
            className="flex items-center gap-2 text-sm font-semibold uppercase tracking-wide text-warning-fg"
          >
            <BookUser className="h-4 w-4" aria-hidden="true" />
            {t("dash.hero.creditTitle")}
          </h2>

          <p className="mt-1.5 flex items-center gap-1.5 text-sm text-body-soft">
            <Users className="h-4 w-4 text-body-muted" aria-hidden="true" />
            {loading
              ? t("dash.hero.loadingCustomers")
              : settled
                ? t("dash.hero.allSettled")
                : t("dash.hero.customersOwing", { count: customerCount ?? 0 })}
          </p>
        </div>

        <div className="flex shrink-0 flex-wrap gap-2">
          <Button onClick={onNewEntry}>
            <BookUser className="h-4 w-4" />
            {t("dash.hero.recordEntry")}
          </Button>
          <Link to="/carnet">
            <Button variant="secondary">
              {t("dash.hero.openBook")}
              <ArrowRight className="h-4 w-4 rtl:rotate-180" aria-hidden="true" />
            </Button>
          </Link>
        </div>
      </div>
    </section>
  );
}