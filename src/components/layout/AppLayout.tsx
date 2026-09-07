import { useEffect, useState } from "react";
import { Outlet, useLocation } from "react-router-dom";
import { Sidebar } from "./Sidebar";
import { Topbar } from "./Topbar";
import { OfflineBanner } from "./OfflineBanner";
import { cn } from "../../lib/utils";
import { SIDEBAR_COLLAPSED_KEY } from "../../lib/constants";

export function AppLayout() {
  const [collapsed, setCollapsed] = useState<boolean>(() => {
    return localStorage.getItem(SIDEBAR_COLLAPSED_KEY) === "1";
  });
  const [mobileOpen, setMobileOpen] = useState(false);
  const location = useLocation();

  useEffect(() => {
    setMobileOpen(false);
  }, [location.pathname]);

  const toggleCollapse = () => {
    setCollapsed((prev) => {
      localStorage.setItem(SIDEBAR_COLLAPSED_KEY, prev ? "0" : "1");
      return !prev;
    });
  };

  return (
    <div className="min-h-screen bg-neutral-50">
      <Sidebar
        collapsed={collapsed}
        onToggleCollapse={toggleCollapse}
        mobileOpen={mobileOpen}
        onCloseMobile={() => setMobileOpen(false)}
      />
      <div
        className={cn(
          "flex min-h-screen flex-col transition-[padding] duration-200",
          collapsed ? "lg:ps-[76px]" : "lg:ps-64"
        )}
      >
        <Topbar onOpenMobileNav={() => setMobileOpen(true)} />
        <OfflineBanner />
        <main className="mx-auto w-full max-w-6xl flex-1 p-4 lg:p-8">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
