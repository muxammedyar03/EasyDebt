"use client";

import { Button } from "@/components/ui/button";

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
  return (
    <div className={`flex items-center justify-between ${className}`}>
      <div className="text-muted-foreground text-sm">
        {currentPage} / {totalPages} sahifa
      </div>
      <div className="flex items-center gap-2">
        <Button variant="outline" size="sm" onClick={() => onPageChange(currentPage - 1)} disabled={currentPage === 1}>
          Oldingi
        </Button>
        <Button
          variant="outline"
          size="sm"
          onClick={() => onPageChange(currentPage + 1)}
          disabled={currentPage === totalPages}
        >
          Keyingi
        </Button>
      </div>
    </div>
  );
}
