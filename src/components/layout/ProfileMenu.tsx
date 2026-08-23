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
        className="flex h-11 w-11 items-center justify-center rounded-full bg-primary-100 text-sm font-semibold text-primary-700 transition hover:bg-primary-200 focus:outline-none focus-visible:ring-2 focus-visible:ring-primary-500"
      >
        {initials(displayName)}
      </button>
      {open && (
        <div
          role="menu"
          className="animate-scale-in absolute end-0 z-50 mt-2 w-60 rounded-xl border border-neutral-200 bg-white p-2 shadow-popover"
        >
          <div className="border-b border-neutral-100 px-3 pb-2.5 pt-1.5">
            <p className="truncate text-sm font-semibold text-neutral-900">{displayName}</p>
            <p className="truncate text-xs text-neutral-500">{user?.email}</p>
          </div>
          <Link
            to="/settings"
            role="menuitem"
            onClick={() => setOpen(false)}
            className="mt-1 flex h-11 items-center gap-2.5 rounded-lg px-3 text-sm font-medium text-neutral-700 hover:bg-neutral-100"
          >
            <Settings className="h-[18px] w-[18px]" />
            {t("nav.settings")}
          </Link>
          <button
            type="button"
            role="menuitem"
            onClick={handleSignOut}
            className="flex h-11 w-full items-center gap-2.5 rounded-lg px-3 text-sm font-medium text-red-600 hover:bg-red-50"
          >
            <LogOut style={{ width: 18, height: 18 }} />
            {t("nav.logout")}
          </button>
        </div>
      )}
    </div>
  );
}
