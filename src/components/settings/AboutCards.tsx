import { Link } from "react-router-dom";
import { CreditCard, ExternalLink, Shield } from "lucide-react";
import { Card } from "../ui/Card";
import { t } from "../../i18n";

/**
 * The two read-only cards at the bottom of Settings.
 *
 * Both are informational and neither has an action, which is why they live
 * together and away from the cards that do something. Extracted when
 * SettingsPage reached the 250-line limit.
 */

export function PlanCard() {
  return (
    <Card title={t("settings.plan.title")} className="max-w-2xl">
      <dl className="space-y-3 text-sm">
        <div className="flex items-center justify-between gap-4 border-b border-line pb-3">
          <dt className="text-body-muted">{t("settings.plan.plan")}</dt>
          <dd className="font-medium text-body">{t("settings.plan.planValue")}</dd>
        </div>
        <div className="flex items-center justify-between gap-4 border-b border-line pb-3">
          <dt className="text-body-muted">{t("settings.plan.status")}</dt>
          <dd className="font-medium text-positive-fg">{t("settings.plan.statusValue")}</dd>
        </div>
      </dl>
      <p className="mt-4 flex items-start gap-2 rounded-lg bg-bg px-3.5 py-3 text-xs leading-relaxed text-body-muted">
        <CreditCard className="mt-0.5 h-4 w-4 shrink-0" />
        {t("settings.plan.note")}
      </p>
    </Card>
  );
}

export function LinksCard() {
  return (
    <Card title={t("settings.links.title")} className="max-w-2xl">
      <ul className="space-y-3 text-sm">
        <li>
          <Link
            to="/privacy"
            className="flex items-center gap-2 py-2 text-body-soft hover:opacity-80"
          >
            <Shield className="h-4 w-4 text-body-muted" />
            {t("settings.links.privacy")}
            <ExternalLink className="h-3 w-3 text-body-muted" />
          </Link>
        </li>
        <li>
          <a
            href="https://github.com/Meykiio/managiha"
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-2 py-2 text-body-soft hover:opacity-80"
          >
            <ExternalLink className="h-4 w-4 text-body-muted" />
            {t("settings.links.sourceCode")}
          </a>
        </li>
      </ul>
      <p className="mt-4 text-xs text-body-muted">
        Managiha v1.0.0 — {t("settings.links.openSource")}
      </p>
    </Card>
  );
}
