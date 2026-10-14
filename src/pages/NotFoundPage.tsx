import { Link } from "react-router-dom";
import { Compass } from "lucide-react";
import { Button } from "../components/ui/Button";
import { t } from "../i18n";

export default function NotFoundPage() {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center gap-4 bg-bg p-6 text-center">
      <span className="flex h-14 w-14 items-center justify-center rounded-full bg-primary-tint">
        <Compass className="h-7 w-7 text-primary" />
      </span>
      <h1 className="text-xl font-semibold text-body">{t("notFound.title")}</h1>
      <p className="max-w-sm text-sm text-body-muted">{t("notFound.body")}</p>
      <Link to="/">
        <Button>{t("notFound.backHome")}</Button>
      </Link>
    </div>
  );
}
