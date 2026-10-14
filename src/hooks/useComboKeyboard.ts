import { useCallback, useEffect, useRef, useState } from "react";

interface ComboKeyboardOptions {
  itemCount: number;
  onSelect: (index: number) => void;
  onClose: () => void;
}

export function useComboKeyboard({ itemCount, onSelect, onClose }: ComboKeyboardOptions) {
  const [activeIndex, setActiveIndex] = useState(0);
  const listRef = useRef<HTMLUListElement>(null);

  useEffect(() => {
    setActiveIndex(0);
  }, [itemCount]);

  useEffect(() => {
    const list = listRef.current;
    if (!list) return;
    const item = list.children[activeIndex] as HTMLElement | undefined;
    item?.scrollIntoView({ block: "nearest" });
  }, [activeIndex]);

  const onKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      if (e.key === "ArrowDown") {
        e.preventDefault();
        setActiveIndex((i) => Math.min(i + 1, itemCount - 1));
      } else if (e.key === "ArrowUp") {
        e.preventDefault();
        setActiveIndex((i) => Math.max(i - 1, 0));
      } else if (e.key === "Enter") {
        e.preventDefault();
        onSelect(activeIndex);
      } else if (e.key === "Escape") {
        e.preventDefault();
        onClose();
      }
    },
    [itemCount, activeIndex, onSelect, onClose]
  );

  return { activeIndex, setActiveIndex, listRef, onKeyDown };
}