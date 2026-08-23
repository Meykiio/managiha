import { useEffect, type ReactNode } from "react";
import { createPortal } from "react-dom";
import { X } from "lucide-react";
import { cn } from "../../lib/utils";

interface ModalProps {
  open: boolean;
  onClose: () => void;
  title?: string;
  children: ReactNode;
  footer?: ReactNode;
  size?: "md" | "lg" | "xl";
}

const sizes = {
  md: "max-w-lg",
  lg: "max-w-2xl",
  xl: "max-w-4xl",
};

export function Modal({ open, onClose, title, children, footer, size = "md" }: ModalProps) {
  useEffect(() => {
    if (!open) return;
    const handler = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    document.addEventListener("keydown", handler);
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", handler);
      document.body.style.overflow = "";
    };
  }, [open, onClose]);

  if (!open) return null;

  return createPortal(
    <div className="fixed inset-0 z-[60] overflow-y-auto">
      <div
        className="animate-fade-in fixed inset-0 bg-neutral-900/40"
        onClick={onClose}
        aria-hidden="true"
      />
      <div className="flex min-h-full items-center justify-center p-4">
        <div
          role="dialog"
          aria-modal="true"
          aria-label={title}
          className={cn(
            "animate-scale-in relative w-full rounded-xl bg-white shadow-popover",
            sizes[size]
          )}
        >
          <header className="flex items-center justify-between gap-3 px-5 pb-3 pt-5">
            <h2 className="text-base font-semibold text-neutral-900">{title}</h2>
            <button
              type="button"
              onClick={onClose}
              aria-label="Fermer"
              className="-me-2 flex h-11 w-11 items-center justify-center rounded-lg text-neutral-400 hover:bg-neutral-100 hover:text-neutral-600"
            >
              <X className="h-5 w-5" />
            </button>
          </header>
          <div className="max-h-[65vh] overflow-y-auto px-5 pb-2">{children}</div>
          {footer && (
            <footer className="flex items-center justify-end gap-3 border-t border-neutral-100 px-5 py-4">
              {footer}
            </footer>
          )}
        </div>
      </div>
    </div>,
    document.body
  );
}
