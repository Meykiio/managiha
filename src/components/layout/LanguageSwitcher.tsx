import { useEffect, useRef, useState } from "react";
import { Check, Globe } from "lucide-react";
import { useLanguageSwitch } from "../../hooks/useLanguageSwitch";
import { t } from "../../i18n";
import { cn } from "../../lib/utils";

interface LanguageSwitcherProps {
  /** `menu` suits a dense topbar; `inline` keeps all options visible. */
  variant?: "menu" | "inline";
}

export function LanguageSwitcher({ variant = "menu" }: LanguageSwitcherProps) {
  const { language, languages, change } = useLanguageSwitch();
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const onPointer = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpen(false);
    };
    document.addEventListener("mousedown", onPointer);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onPointer);
      document.removeEventListener("keydown", onKey);
    };
  }, [open]);

  if (variant === "inline") {
    return (
      <div
        className="inline-flex items-center gap-1 rounded-full border border-neutral-200 bg-white p-1"
        role="group"
        aria-label={t("language.switch")}
      >
        {languages.map((meta) => (
          <button
            key={meta.code}
            type="button"
            onClick={() => change(meta.code)}
            aria-current={meta.code === language}
            className={cn(
              "h-9 rounded-full px-3 text-sm font-medium transition",
              "focus:outline-none focus-visible:ring-2 focus-visible:ring-primary-500",
              meta.code === language
                ? "bg-primary-600 text-white"
                : "text-neutral-600 hover:bg-neutral-100"
            )}
          >
            {meta.label}
          </button>
        ))}
      </div>
    );
  }

  return (
    <div className="relative" ref={ref}>
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-haspopup="menu"
        aria-expanded={open}
        aria-label={t("language.switch")}
        className="flex h-11 items-center gap-1.5 rounded-lg px-2.5 text-sm font-medium text-neutral-600 transition hover:bg-neutral-100 focus:outline-none focus-visible:ring-2 focus-visible:ring-primary-500"
      >
        <Globe className="h-[18px] w-[18px]" />
        <span className="uppercase">{language}</span>
      </button>
      {open && (
        <div
          role="menu"
          className="animate-scale-in absolute end-0 z-50 mt-2 w-44 rounded-xl border border-neutral-200 bg-white p-2 shadow-popover"
        >
          {languages.map((meta) => (
            <button
              key={meta.code}
              type="button"
              role="menuitemradio"
              aria-checked={meta.code === language}
              onClick={() => {
                change(meta.code);
                setOpen(false);
              }}
              className="flex h-11 w-full items-center gap-2.5 rounded-lg px-3 text-sm font-medium text-neutral-700 hover:bg-neutral-100"
            >
              <span className="flex-1 text-start">{meta.label}</span>
              {meta.code === language && (
                <Check className="h-4 w-4 text-primary-600" aria-hidden="true" />
              )}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
