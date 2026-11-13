"use client";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Filter, RotateCcw, Search } from "lucide-react";
import { useTranslations } from "next-intl";

type SearchFilterDialogProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  search: string;
  onSearchChange: (value: string) => void;
  onApply: () => void;
  onReset: () => void;
};

export function SearchFilterDialog({
  open,
  onOpenChange,
  search,
  onSearchChange,
  onApply,
  onReset,
}: SearchFilterDialogProps) {
  const t = useTranslations("companyTransactions");
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-lg">
            <Filter className="h-5 w-5" />
            {t("filter")}
          </DialogTitle>
        </DialogHeader>

        <div className="grid gap-4 py-2">
          <div className="grid gap-2">
            <Label className="text-base">{t("companyName")}</Label>
            <Input
              placeholder={t("searchPlaceholder")}
              value={search}
              onChange={(e) => onSearchChange(e.target.value)}
              className="h-9 text-base"
            />
          </div>
        </div>

        <DialogFooter className="gap-2 sm:justify-between">
          <Button type="button" variant="outline" className="h-9" onClick={onReset}>
            <RotateCcw className="mr-2 h-4 w-4" />
            {t("reset")}
          </Button>
          <Button type="button" className="h-9" onClick={onApply}>
            <Search className="mr-2 h-4 w-4" />
            {t("applyFilter")}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
