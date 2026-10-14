import { NavLink } from "react-router-dom";
import {
  BookUser,
  Boxes,
  FileText,
  LayoutDashboard,
  Package,
  PanelLeftClose,
  PanelLeftOpen,
  ScanBarcode,
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
  { to: "/scanner", labelKey: "nav.scanner", icon: ScanBarcode },
  { to: "/", labelKey: "nav.dashboard", icon: LayoutDashboard, end: true },
  { to: "/products", labelKey: "nav.products", icon: Package },
  { to: "/inventory", labelKey: "nav.inventory", icon: Boxes },
  { to: "/carnet", labelKey: "nav.carnet", icon: BookUser },
  { to: "/suppliers", labelKey: "nav.suppliers", icon: Truck },
  { to: "/reports", labelKey: "nav.reports", icon: FileText },
];

/**
 * Two groups rather than one flat list.
 *
 * The split is by how often the owner touches each screen, not by what the
 * screens are: the first block is the working day, the last two are consulted
 * when setting something up or reviewing. A flat list makes the reader scan all
 * of it every time; a grouping lets them skip a block.
 *
 * The scanner sits first because it is the one action taken dozens of times a
 * day. It used to be reachable from a single dashboard button and nowhere else,
 * which meant the most-used screen in the product was the hardest to get to.
 *
 * Labels are hidden when the rail is collapsed, where they would be clipped to
 * nothing and only add noise.
 */
const NAV_GROUPS: { labelKey: Parameters<typeof t>[0]; items: NavItem[] }[] = [
  { labelKey: "nav.groupOperations", items: MAIN_NAV.slice(0, 5) },
  { labelKey: "nav.groupReference", items: MAIN_NAV.slice(5) },
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
            ? "bg-primary-tint text-primary"
            : "text-body-soft hover:bg-surface-high hover:text-body",
          collapsed && "justify-center px-0"
        )
      }
    >
      <Icon className="h-5 w-5 shrink-0" aria-hidden="true" />
      {!collapsed && <span className="truncate">{t(item.labelKey)}</span>}
      {collapsed && (
        <span
          role="tooltip"
          className="pointer-events-none absolute start-full z-50 ms-2 hidden whitespace-nowrap rounded-md bg-body px-2.5 py-1.5 text-xs font-medium text-onPrimary shadow-popover group-hover:block"
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
      <div className={cn("flex h-16 shrink-0 items-center border-b border-line", collapsed ? "justify-center px-2" : "px-4")}>
        {!collapsed && <Logo />}
        {collapsed && (
          <span className="group relative flex">
            <Logo collapsed />
            <span className="pointer-events-none absolute start-full top-1/2 z-50 ms-3 hidden -translate-y-1/2 whitespace-nowrap rounded-md bg-body px-2.5 py-1.5 text-xs font-semibold text-onPrimary shadow-popover group-hover:block">
              {t("app.name")}
            </span>
          </span>
        )}
      </div>
      <nav className="flex-1 overflow-y-auto p-3" aria-label={t("nav.mainGroup")}>
        {NAV_GROUPS.map((group, index) => (
          <div key={group.labelKey} className={cn(index > 0 && "mt-5")}>
            {collapsed ? (
              index > 0 && <div className="mx-2 mb-2 border-t border-line" aria-hidden="true" />
            ) : (
              <h2 className="px-3 pb-2 text-[11px] font-semibold uppercase tracking-wider text-body-muted">
                {t(group.labelKey)}
              </h2>
            )}
            <div className="space-y-1">
              {group.items.map((item) => (
                <SidebarLink
                  key={item.to}
                  item={item}
                  collapsed={collapsed}
                  onNavigate={onNavigate}
                />
              ))}
            </div>
          </div>
        ))}
      </nav>
      <div className="space-y-1 border-t border-line p-3">
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
      className="mx-auto mb-2 hidden h-11 w-11 items-center justify-center rounded-lg text-body-muted transition-colors hover:bg-surface-high hover:text-body-soft lg:flex"
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
          "fixed inset-y-0 start-0 z-40 hidden flex-col border-e border-line bg-surface transition-[width] duration-200 lg:flex",
          collapsed ? "w-[76px]" : "w-64"
        )}
      >
        <SidebarContent collapsed={collapsed} />
        <CollapseButton collapsed={collapsed} onToggle={onToggleCollapse} />
      </aside>

      <div
        className={cn(
          "fixed inset-0 z-40 bg-body/40 transition-opacity lg:hidden",
          mobileOpen ? "opacity-100" : "pointer-events-none opacity-0"
        )}
        onClick={onCloseMobile}
        aria-hidden="true"
      />
      <aside
        className={cn(
          "fixed inset-y-0 start-0 z-50 flex w-72 flex-col border-e border-line bg-surface transition-transform duration-200 lg:hidden",
          mobileOpen ? "translate-x-0" : "-translate-x-full rtl:translate-x-full"
        )}
      >
        <button
          type="button"
          onClick={onCloseMobile}
          aria-label={t("nav.closeMenu")}
          className="absolute end-2 top-3 flex h-11 w-11 items-center justify-center rounded-lg text-body-muted hover:bg-surface-high"
        >
          <X className="h-5 w-5" />
        </button>
        <SidebarContent collapsed={false} onNavigate={onCloseMobile} />
      </aside>
    </>
  );
}
