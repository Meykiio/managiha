import { useEffect, useMemo, useRef, useState } from "react";
import { Plus } from "lucide-react";
import { ensureCategory, fetchCategories } from "../../lib/api";
import type { Category } from "../../lib/types";
import { cn } from "../../lib/utils";
import { useComboKeyboard } from "../../hooks/useComboKeyboard";
import { t } from "../../i18n";

interface CategoryComboProps {
  storeId: string;
  value: string | null;
  onChange: (categoryId: string | null) => void;
}

export function CategoryCombo({ storeId, value, onChange }: CategoryComboProps) {
  const [categories, setCategories] = useState<Category[]>([]);
  const [text, setText] = useState("");
  const [open, setOpen] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    fetchCategories(storeId)
      .then(setCategories)
      .catch(() => setCategories([]));
  }, [storeId]);

  useEffect(() => {
    const selected = categories.find((c) => c.id === value);
    setText(selected ? selected.name : "");
  }, [value, categories]);

  useEffect(() => {
    if (!open) return;
    const handler = (e: MouseEvent) => {
      if (rootRef.current && !rootRef.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [open]);

  const suggestions = useMemo(() => {
    const q = text.trim().toLowerCase();
    return categories
      .filter((c) => c.name.toLowerCase().includes(q))
      .slice(0, 8);
  }, [categories, text]);

  const exactExists = categories.some(
    (c) => c.name.toLowerCase() === text.trim().toLowerCase()
  );
  const canCreate = text.trim().length > 0 && !exactExists;
  const itemCount = suggestions.length + (canCreate ? 1 : 0);

  const { activeIndex, setActiveIndex, listRef, onKeyDown } = useComboKeyboard({
    itemCount,
    onSelect: (index) => {
      if (index < suggestions.length) {
        onChange(suggestions[index].id);
        setOpen(false);
      } else {
        handleCreate();
      }
    },
    onClose: () => setOpen(false),
  });

  const handleCreate = async () => {
    try {
      const category = await ensureCategory(storeId, text.trim());
      setCategories((prev) =>
        prev.some((c) => c.id === category.id) ? prev : [...prev, category]
      );
      onChange(category.id);
      setOpen(false);
    } catch {
      setOpen(false);
    }
  };

  return (
    <div className="relative w-full" ref={rootRef}>
      <label
        htmlFor="category-combo"
        className="mb-1.5 block text-sm font-medium text-neutral-700"
      >
        {t("categoryCombo.label")}
      </label>
      <input
        id="category-combo"
        autoComplete="off"
        value={text}
        placeholder={t("categoryCombo.placeholder")}
        onFocus={() => setOpen(true)}
        onChange={(e) => {
          setText(e.target.value);
          setOpen(true);
          onChange(null);
        }}
        onKeyDown={open ? onKeyDown : undefined}
        className="h-11 w-full rounded-lg border border-neutral-300 bg-white px-3.5 text-sm text-neutral-900 placeholder:text-neutral-400 focus:border-primary-500 focus:outline-none focus:ring-2 focus:ring-primary-100"
      />
      <input type="hidden" name="category_id" value={value ?? ""} />
      {open && (
        <ul ref={listRef} className="absolute inset-x-0 z-20 mt-1 max-h-56 overflow-y-auto rounded-xl border border-neutral-200 bg-white p-1.5 shadow-popover">
          {suggestions.map((c, index) => (
            <li key={c.id}>
              <button
                type="button"
                onClick={() => {
                  onChange(c.id);
                  setOpen(false);
                }}
                onMouseEnter={() => setActiveIndex(index)}
                className={cn(
                  "w-full rounded-lg px-3 py-2.5 text-start text-sm font-medium text-neutral-800 hover:bg-neutral-50",
                  index === activeIndex && "bg-primary-50"
                )}
              >
                {c.name}
              </button>
            </li>
          ))}
          {canCreate && (
            <li>
              <button
                type="button"
                onClick={handleCreate}
                onMouseEnter={() => setActiveIndex(suggestions.length)}
                className={cn(
                  "flex w-full items-center gap-2 rounded-lg px-3 py-2.5 text-start text-sm font-semibold text-primary-700 hover:bg-primary-50",
                  activeIndex === suggestions.length && "bg-primary-50"
                )}
              >
                <Plus className="h-4 w-4" />
                {t("common.add")} « {text.trim()} »
              </button>
            </li>
          )}
          {!canCreate && suggestions.length === 0 && (
            <li className="px-3 py-2 text-sm text-neutral-500">
              {t("categoryCombo.empty")}
            </li>
          )}
        </ul>
      )}
    </div>
  );
}
