import { cn } from "../../lib/utils";
import { t } from "../../i18n";

interface LogoProps {
  collapsed?: boolean;
  className?: string;
}

export function Logo({ collapsed, className }: LogoProps) {
  return (
    <span className={cn("flex items-center gap-2.5", className)}>
      <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-primary-600 text-white shadow-sm">
        <svg viewBox="0 0 32 32" className="h-5 w-5" fill="none">
          <path
            d="M8 23V9l8 8 8-8v14"
            stroke="currentColor"
            strokeWidth="3.5"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </svg>
      </span>
      {!collapsed && (
        <span className="flex flex-col leading-tight">
          <span className="text-base font-bold tracking-tight text-neutral-900">
            {t("app.name")}
          </span>
          <span className="text-[11px] font-medium text-neutral-400">
            {t("app.tagline")}
          </span>
        </span>
      )}
    </span>
  );
}
