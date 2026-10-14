import { useRef } from "react";
import { cn } from "../../lib/utils";

interface TabsProps<T extends string> {
  tabs: { key: T; label: string }[];
  active: T;
  onChange: (key: T) => void;
  className?: string;
  /** Prefix for the generated element ids. Must match the tab panels' ids. */
  idPrefix?: string;
}

/**
 * WAI-ARIA tabs with the full keyboard contract.
 *
 * Previously the tab buttons had no id, while the panels this component sits
 * above set aria-labelledby="tab-<key>". That is a dangling ARIA reference: the
 * label every tab panel announced did not exist. With role="tablist" the pattern
 * also requires arrow-key navigation and a roving tabindex, which were missing,
 * so a keyboard user could only reach the tabs by tabbing through all of them.
 */
export function Tabs<T extends string>({
  tabs,
  active,
  onChange,
  className,
  idPrefix = "tab",
}: TabsProps<T>) {
  const listRef = useRef<HTMLDivElement>(null);

  const focusTab = (index: number) => {
    const buttons = listRef.current?.querySelectorAll<HTMLButtonElement>('[role="tab"]');
    const target = buttons?.[(index + buttons.length) % buttons.length];
    target?.focus();
    if (target) onChange(target.dataset.key as T);
  };

  return (
    // The WAI-ARIA tabs pattern puts focus on the active tab with a roving
    // tabindex, never on the tablist container, so this div is deliberately not
    // focusable. The lint rule assumes otherwise.
    // eslint-disable-next-line jsx-a11y/interactive-supports-focus
    <div
      ref={listRef}
      className={cn(
        // `w-full` is kept so a short strip still spans the row and stretches,
        // which is the design. A long strip keeps that width too — the overflow
        // scrolls inside the strip instead of widening the page.
        //
        // `max-w-full` covers the flex-parent case, where a child's automatic
        // minimum size would otherwise let it push its parent wider than the screen.
        "inline-flex w-full max-w-full items-center gap-1 overflow-x-auto rounded-xl bg-surface-high p-1 no-scrollbar sm:w-auto",
        className
      )}
      role="tablist"
      onKeyDown={(e) => {
        // Prefer the actually-focused tab over the `active` prop. A parent may not
        // have re-rendered yet between two fast keypresses, and using `active`
        // would send both to the same tab.
        const buttons = Array.from(
          listRef.current?.querySelectorAll<HTMLElement>('[role="tab"]') ?? []
        );
        const focusedIndex = buttons.findIndex((b) => b === document.activeElement);
        const current =
          focusedIndex >= 0 ? focusedIndex : tabs.findIndex((tab) => tab.key === active);
        if (current < 0) return;
        // RTL: ArrowLeft moves forward through the visual order.
        const forward = document.documentElement.dir === "rtl" ? -1 : 1;
        if (e.key === "ArrowRight") {
          e.preventDefault();
          focusTab(current + forward);
        } else if (e.key === "ArrowLeft") {
          e.preventDefault();
          focusTab(current - forward);
        } else if (e.key === "Home") {
          e.preventDefault();
          focusTab(0);
        } else if (e.key === "End") {
          e.preventDefault();
          focusTab(tabs.length - 1);
        }
      }}
    >
      {tabs.map((tab) => (
        <button
          key={tab.key}
          id={`${idPrefix}-${tab.key}`}
          data-key={tab.key}
          type="button"
          role="tab"
          aria-selected={tab.key === active}
          aria-controls={`${idPrefix}-panel-${tab.key}`}
          tabIndex={tab.key === active ? 0 : -1}
          onClick={() => onChange(tab.key)}
          className={cn(
            "h-11 flex-1 whitespace-nowrap rounded-lg px-4 text-sm font-medium transition sm:flex-none",
            "focus:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-1",
            tab.key === active
              ? "bg-surface text-body shadow-sm"
              : "text-body-muted hover:text-body"
          )}
        >
          {tab.label}
        </button>
      ))}
    </div>
  );
}