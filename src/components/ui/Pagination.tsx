import { ChevronLeft, ChevronRight } from "lucide-react";
import { t } from "../../i18n";
import { Button } from "./Button";

interface PaginationProps {
  page: number;
  totalPages: number;
  onChange: (page: number) => void;
}

export function Pagination({ page, totalPages, onChange }: PaginationProps) {
  if (totalPages <= 1) return null;
  return (
    <div className="flex items-center justify-between gap-3">
      <p className="text-sm text-neutral-500">
        {t("common.page", { page, total: totalPages })}
      </p>
      <div className="flex gap-2">
        <Button
          variant="secondary"
          size="icon"
          aria-label={t("common.previous")}
          disabled={page <= 1}
          onClick={() => onChange(page - 1)}
        >
          <ChevronLeft className="h-5 w-5" />
        </Button>
        <Button
          variant="secondary"
          size="icon"
          aria-label={t("common.next")}
          disabled={page >= totalPages}
          onClick={() => onChange(page + 1)}
        >
          <ChevronRight className="h-5 w-5" />
        </Button>
      </div>
    </div>
  );
}
