import { NavLink } from "react-router-dom";
import {
  BookUser,
  Boxes,
  FileText,
  LayoutDashboard,
  Package,
  PanelLeftClose,
  PanelLeftOpen,
  Settings,
  Truck,
  X,
} from "lucide-react";
import { cn } from "../../lib/utils";
import { t } from "../../i18n";
import { Logo } from "./Logo";

interface NavItem {
  to: string;
  labelKey: Parameters<typeof t>[0];
  icon: typeof Package;
  end?: boolean;
}

const MAIN_NAV: NavItem[] = [
  { to: "/", labelKey: "nav.dashboard", icon: LayoutDashboard, end: true },
  { to: "/products", labelKey: "nav.products", icon: Package },
  { to: "/inventory", labelKey: "nav.inventory", icon: Boxes },
  { to: "/carnet", labelKey: "nav.carnet", icon: BookUser },
  { to: "/suppliers", labelKey: "nav.suppliers", icon: Truck },
  { to: "/reports", labelKey: "nav.reports", icon: FileText },
];

const BOTTOM_NAV: NavItem[] = [
  { to: "/settings", labelKey: "nav.settings", icon: Settings },
];

interface SidebarContentProps {
  collapsed: boolean;
  onNavigate?: () => void;
}

function SidebarLink({ item, collapsed, onNavigate }: SidebarContentProps & { item: NavItem }) {
  const Icon = item.icon;
  return (
    <NavLink
      to={item.to}
      end={item.end}
      onClick={onNavigate}
      className={({ isActive }) =>
        cn(
          "group relative flex h-11 items-center gap-3 rounded-lg px-3 text-sm font-medium transition-colors",
          isActive
            ? "bg-primary-50 text-primary-700"
            : "text-neutral-600 hover:bg-neutral-100 hover:text-neutral-900",
          collapsed && "justify-center px-0"
        )
      }
    >
      <Icon className="h-5 w-5 shrink-0" aria-hidden="true" />
      {!collapsed && <span className="truncate">{t(item.labelKey)}</span>}
      {collapsed && (
        <span
          role="tooltip"
          className="pointer-events-none absolute start-full z-50 ms-2 hidden whitespace-nowrap rounded-md bg-neutral-900 px-2.5 py-1.5 text-xs font-medium text-white shadow-popover group-hover:block"
        >
          {t(item.labelKey)}
        </span>
      )}
    </NavLink>
  );
}

export function SidebarContent({ collapsed, onNavigate }: SidebarContentProps) {
  return (
    <>
      <div className={cn("flex h-16 shrink-0 items-center border-b border-neutral-100", collapsed ? "justify-center px-2" : "px-4")}>
        {!collapsed && <Logo />}
        {collapsed && (
          <span className="group relative flex">
            <Logo collapsed />
            <span className="pointer-events-none absolute start-full top-1/2 z-50 ms-3 hidden -translate-y-1/2 whitespace-nowrap rounded-md bg-neutral-900 px-2.5 py-1.5 text-xs font-semibold text-white shadow-popover group-hover:block">
              {t("app.name")}
            </span>
          </span>
        )}
      </div>
      <nav className="flex-1 space-y-1 overflow-y-auto p-3" aria-label={t("nav.mainGroup")}>
        {MAIN_NAV.map((item) => (
          <SidebarLink key={item.to} item={item} collapsed={collapsed} onNavigate={onNavigate} />
        ))}
      </nav>
      <div className="space-y-1 border-t border-neutral-100 p-3">
        {BOTTOM_NAV.map((item) => (
          <SidebarLink key={item.to} item={item} collapsed={collapsed} onNavigate={onNavigate} />
        ))}
      </div>
    </>
  );
}

function CollapseButton({ collapsed, onToggle }: { collapsed: boolean; onToggle: () => void }) {
  return (
    <button
      type="button"
      onClick={onToggle}
      title={collapsed ? t("nav.expand") : t("nav.collapse")}
      aria-label={collapsed ? t("nav.expand") : t("nav.collapse")}
      className="mx-auto mb-2 hidden h-11 w-11 items-center justify-center rounded-lg text-neutral-400 transition-colors hover:bg-neutral-100 hover:text-neutral-700 lg:flex"
    >
      {collapsed ? <PanelLeftOpen className="h-5 w-5" /> : <PanelLeftClose className="h-5 w-5" />}
    </button>
  );
}

interface SidebarProps {
  collapsed: boolean;
  onToggleCollapse: () => void;
  mobileOpen: boolean;
  onCloseMobile: () => void;
}

export function Sidebar({ collapsed, onToggleCollapse, mobileOpen, onCloseMobile }: SidebarProps) {
  return (
    <>
      <aside
        className={cn(
          "fixed inset-y-0 start-0 z-40 hidden flex-col border-e border-neutral-200 bg-white transition-[width] duration-200 lg:flex",
          collapsed ? "w-[76px]" : "w-64"
        )}
      >
        <SidebarContent collapsed={collapsed} />
        <CollapseButton collapsed={collapsed} onToggle={onToggleCollapse} />
      </aside>

      <div
        className={cn(
          "fixed inset-0 z-40 bg-neutral-900/40 transition-opacity lg:hidden",
          mobileOpen ? "opacity-100" : "pointer-events-none opacity-0"
        )}
        onClick={onCloseMobile}
        aria-hidden="true"
      />
      <aside
        className={cn(
          "fixed inset-y-0 start-0 z-50 flex w-72 flex-col border-e border-neutral-200 bg-white transition-transform duration-200 lg:hidden",
          mobileOpen ? "translate-x-0" : "-translate-x-full rtl:translate-x-full"
        )}
      >
        <button
          type="button"
          onClick={onCloseMobile}
          aria-label={t("nav.closeMenu")}
          className="absolute end-2 top-3 flex h-11 w-11 items-center justify-center rounded-lg text-neutral-400 hover:bg-neutral-100"
        >
          <X className="h-5 w-5" />
        </button>
        <SidebarContent collapsed={false} onNavigate={onCloseMobile} />
      </aside>
    </>
  );
}
