import { Moon, Sun } from "lucide-react";
import { useTheme } from "../../contexts/ThemeContext";
import { t } from "../../i18n";

/**
 * Theme toggle.
 *
 * Sits in the topbar next to the profile menu — reachable from every page, which
 * matters because a shopkeeper working in daylight may want light and someone
 * doing the accounts at night may not. Choice is persisted.
 *
 * The icon shows the theme you would switch *to*, not the one you are in, and the
 * accessible name says so explicitly. A bare sun/moon is genuinely ambiguous, and
 * the system's own accessibility rule is that every button has an accessible name.
 */
export function ThemeToggle() {
  const { theme, toggleTheme } = useTheme();
  const nextIsLight = theme === "dark";

  return (
    <button
      type="button"
      onClick={toggleTheme}
      aria-label={nextIsLight ? t("theme.switchToLight") : t("theme.switchToDark")}
      title={nextIsLight ? t("theme.switchToLight") : t("theme.switchToDark")}
      /* 44px touch target, per the system's touch-scale rule. */
      className="flex h-11 w-11 items-center justify-center rounded-lg text-body-soft transition-colors duration-fast ease-snappy hover:bg-surface-high hover:text-body"
    >
      {nextIsLight ? (
        <Sun className="h-5 w-5" aria-hidden="true" />
      ) : (
        <Moon className="h-5 w-5" aria-hidden="true" />
      )}
    </button>
  );
}
