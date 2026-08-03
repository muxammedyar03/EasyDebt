"use client";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Filter, RotateCcw, Search } from "lucide-react";
import { getQuickRanges } from "@/lib/companies/period-ranges";

export type PeriodFilterValues = {
  dateFrom: string;
  dateTo: string;
  search: string;
};

type PeriodFilterDialogProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  values: PeriodFilterValues;
  onChange: (values: PeriodFilterValues) => void;
  onApply: () => void;
  onReset: () => void;
};

export function PeriodFilterDialog({
  open,
  onOpenChange,
  values,
  onChange,
  onApply,
  onReset,
}: PeriodFilterDialogProps) {
  const quick = getQuickRanges();

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-xl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Filter className="h-4 w-4" />
            Filter
          </DialogTitle>
        </DialogHeader>

        <div className="grid gap-4 py-2">
          <div className="grid gap-1.5">
            <Label>Kompaniya nomi</Label>
            <Input
              placeholder="Qidirish..."
              value={values.search}
              onChange={(e) => onChange({ ...values, search: e.target.value })}
            />
          </div>

          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <div className="grid gap-1.5">
              <Label>Sana dan</Label>
              <Input
                type="date"
                value={values.dateFrom}
                onChange={(e) => onChange({ ...values, dateFrom: e.target.value })}
              />
            </div>
            <div className="grid gap-1.5">
              <Label>Sana gacha</Label>
              <Input
                type="date"
                value={values.dateTo}
                onChange={(e) => onChange({ ...values, dateTo: e.target.value })}
              />
            </div>
          </div>

          <div className="flex flex-wrap gap-2">
            <Button
              type="button"
              variant="secondary"
              size="sm"
              onClick={() => onChange({ ...values, ...quick.thisMonth })}
            >
              Bu oy
            </Button>
            <Button
              type="button"
              variant="secondary"
              size="sm"
              onClick={() => onChange({ ...values, ...quick.lastMonth })}
            >
              O&apos;tgan oy
            </Button>
            <Button
              type="button"
              variant="secondary"
              size="sm"
              onClick={() => onChange({ ...values, ...quick.last3Months })}
            >
              Oxirgi 3 oy
            </Button>
            <Button
              type="button"
              variant="secondary"
              size="sm"
              onClick={() => onChange({ ...values, ...quick.last6Months })}
            >
              Oxirgi 6 oy
            </Button>
          </div>
        </div>

        <DialogFooter className="gap-2 sm:justify-between">
          <Button type="button" variant="outline" onClick={onReset}>
            <RotateCcw className="mr-2 h-4 w-4" />
            Reset
          </Button>
          <Button type="button" onClick={onApply}>
            <Search className="mr-2 h-4 w-4" />
            Filter
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
