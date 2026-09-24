"use client";

import { Button } from "@/components/ui/button";
import { useTranslations } from "next-intl";

type DebtorsTablePaginationProps = {
  currentPage: number;
  totalPages: number;
  onPageChange: (page: number) => void;
  /** Mobile: yuqoridagi blok uchun `md:hidden`, desktop: `hidden md:flex` yoki default */
  className?: string;
};

export function DebtorsTablePagination({
  currentPage,
  totalPages,
  onPageChange,
  className = "",
}: DebtorsTablePaginationProps) {
  const tCommon = useTranslations("common");

  return (
    <div className={`flex items-center justify-between ${className}`}>
      <div className="text-muted-foreground text-sm">
        {tCommon("pageOf", { current: currentPage, total: totalPages })}
      </div>
      <div className="flex items-center gap-2">
        <Button variant="outline" size="sm" onClick={() => onPageChange(currentPage - 1)} disabled={currentPage === 1}>
          {tCommon("previous")}
        </Button>
        <Button
          variant="outline"
          size="sm"
          onClick={() => onPageChange(currentPage + 1)}
          disabled={currentPage === totalPages || totalPages === 0}
        >
          {tCommon("next")}
        </Button>
      </div>
    </div>
  );
}
