import { useEffect, useRef, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { LogOut, Settings } from "lucide-react";
import { useAuth } from "../../contexts/AuthContext";
import { initials } from "../../lib/format";
import { t } from "../../i18n";

export function ProfileMenu() {
  const { profile, user, store, signOut } = useAuth();
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  const navigate = useNavigate();

  useEffect(() => {
    if (!open) return;
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [open]);

  const displayName = profile?.full_name || store?.name || user?.email || "?";

  const handleSignOut = async () => {
    setOpen(false);
    await signOut();
    navigate("/login");
  };

  return (
    <div className="relative" ref={ref}>
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-haspopup="menu"
        aria-expanded={open}
        className="flex h-11 w-11 items-center justify-center rounded-full bg-primary-tint-strong text-sm font-semibold text-primary transition hover:bg-primary-tint-strong focus:outline-none focus-visible:ring-2 focus-visible:ring-primary"
      >
        {initials(displayName)}
      </button>
      {open && (
        <div
          role="menu"
          className="animate-scale-in absolute end-0 z-50 mt-2 w-60 rounded-xl border border-line bg-surface p-2 shadow-popover"
        >
          <div className="border-b border-line px-3 pb-2.5 pt-1.5">
            <p className="truncate text-sm font-semibold text-body">{displayName}</p>
            <p className="truncate text-xs text-body-muted">{user?.email}</p>
          </div>
          <Link
            to="/settings"
            role="menuitem"
            onClick={() => setOpen(false)}
            className="mt-1 flex h-11 items-center gap-2.5 rounded-lg px-3 text-sm font-medium text-body-soft hover:bg-surface-high"
          >
            <Settings className="h-[18px] w-[18px]" />
            {t("nav.settings")}
          </Link>
          <button
            type="button"
            role="menuitem"
            onClick={handleSignOut}
            className="flex h-11 w-full items-center gap-2.5 rounded-lg px-3 text-sm font-medium text-error-fg hover:bg-error-tint"
          >
            {/* Class, not a style prop: this was the only inline style in the
                app, and removing it is what lets the Content-Security-Policy
                omit style-src 'unsafe-inline'. */}
            <LogOut className="h-[18px] w-[18px]" />
            {t("nav.logout")}
          </button>
        </div>
      )}
    </div>
  );
}
