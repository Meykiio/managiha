import { cn } from "../../lib/utils";

interface TabsProps<T extends string> {
  tabs: { key: T; label: string }[];
  active: T;
  onChange: (key: T) => void;
  className?: string;
}

export function Tabs<T extends string>({ tabs, active, onChange, className }: TabsProps<T>) {
  return (
    <div
      className={cn(
        "inline-flex w-full items-center gap-1 rounded-xl bg-neutral-100 p-1 sm:w-auto",
        className
      )}
      role="tablist"
    >
      {tabs.map((tab) => (
        <button
          key={tab.key}
          type="button"
          role="tab"
          aria-selected={tab.key === active}
          onClick={() => onChange(tab.key)}
          className={cn(
            "h-11 flex-1 whitespace-nowrap rounded-lg px-4 text-sm font-medium transition sm:flex-none",
            tab.key === active
              ? "bg-white text-neutral-900 shadow-sm"
              : "text-neutral-500 hover:text-neutral-800"
          )}
        >
          {tab.label}
        </button>
      ))}
    </div>
  );
}
