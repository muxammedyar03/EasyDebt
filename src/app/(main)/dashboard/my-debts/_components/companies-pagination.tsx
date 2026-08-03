"use client";

import { Button } from "@/components/ui/button";

type CompaniesPaginationProps = {
  currentPage: number;
  totalPages: number;
  onPageChange: (page: number) => void;
};

export function CompaniesPagination({ currentPage, totalPages, onPageChange }: CompaniesPaginationProps) {
  if (totalPages <= 1) return null;

  return (
    <div className="flex items-center justify-between">
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
