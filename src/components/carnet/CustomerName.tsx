import { ANONYMISED_CUSTOMER_NAME } from "../../lib/constants";
import { t } from "../../i18n";

/**
 * A carnet customer's name, with the erasure marker translated.
 *
 * The database stores `[anonymised]` rather than a readable label so that it holds
 * no language. Everything that displays a customer name goes through here.
 */
export function CustomerName({ name }: { name: string }) {
  if (name === ANONYMISED_CUSTOMER_NAME) {
    return <span className="italic text-body-muted">{t("customerDetail.anonymizedName")}</span>;
  }
  return <>{name}</>;
}

export function isAnonymised(name: string): boolean {
  return name === ANONYMISED_CUSTOMER_NAME;
}
