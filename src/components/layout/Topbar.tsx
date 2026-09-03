import { Menu } from "lucide-react";
import { useLocation, matchPath } from "react-router-dom";
import { ProfileMenu } from "./ProfileMenu";
import { LanguageSwitcher } from "./LanguageSwitcher";
import { t } from "../../i18n";

function resolveTitle(pathname: string): string {
  if (matchPath("/", pathname)) return t("nav.dashboard");
  if (pathname.startsWith("/products")) return t("nav.products");
  if (pathname.startsWith("/inventory")) return t("nav.inventory");
  if (pathname.startsWith("/carnet")) return t("nav.carnet");
  if (pathname.startsWith("/suppliers")) return t("nav.suppliers");
  if (pathname.startsWith("/reports")) return t("nav.reports");
  if (pathname.startsWith("/settings")) return t("nav.settings");
  return t("app.name");
}

interface TopbarProps {
  onOpenMobileNav: () => void;
}

export function Topbar({ onOpenMobileNav }: TopbarProps) {
  const location = useLocation();
  const title = resolveTitle(location.pathname);

  return (
    <header className="sticky top-0 z-30 flex h-16 items-center gap-2 border-b border-neutral-200 bg-white/90 px-4 backdrop-blur lg:px-8">
      <button
        type="button"
        onClick={onOpenMobileNav}
        aria-label={t("nav.openMenu")}
        className="flex h-11 w-11 items-center justify-center rounded-lg text-neutral-600 hover:bg-neutral-100 lg:hidden"
      >
        <Menu className="h-6 w-6" />
      </button>
      <h1 className="truncate text-base font-semibold text-neutral-900 lg:text-lg">
        {title}
      </h1>
      <div className="ms-auto flex items-center gap-1">
        <LanguageSwitcher />
        <ProfileMenu />
      </div>
    </header>
  );
}
