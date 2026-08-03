"use client";

import { FileDown, Plus, Search } from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { exportCompaniesListToExcel } from "@/lib/companies/export-companies-excel-client";
import { getErrorMessage } from "@/lib/errors";

type CompaniesToolbarProps = {
  searchValue: string;
  onSearchChange: (value: string) => void;
  isSearching: boolean;
  status: string;
  sortBy: string;
  dateFrom: string;
  dateTo: string;
  minAmount: string;
  maxAmount: string;
  onStatusChange: (status: string) => void;
  onSortChange: (sortBy: string) => void;
  onDateFromChange: (value: string) => void;
  onDateToChange: (value: string) => void;
  onMinAmountChange: (value: string) => void;
  onMaxAmountChange: (value: string) => void;
  onAddCompany: () => void;
};

export function CompaniesToolbar({
  searchValue,
  onSearchChange,
  isSearching,
  status,
  sortBy,
  dateFrom,
  dateTo,
  minAmount,
  maxAmount,
  onStatusChange,
  onSortChange,
  onDateFromChange,
  onDateToChange,
  onMinAmountChange,
  onMaxAmountChange,
  onAddCompany,
}: CompaniesToolbarProps) {
  const handleExcel = async () => {
    try {
      const { rowCount } = await exportCompaniesListToExcel({ search: searchValue, status });
      toast.success(`${rowCount} ta kompaniya Excelga yuklandi`);
    } catch (error) {
      toast.error(getErrorMessage(error, "Excel export xatosi"));
    }
  };

  return (
    <section className="flex flex-col gap-3">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="relative flex-1 lg:max-w-xl">
          <Search className="text-muted-foreground absolute top-3.5 left-2.5 h-4 w-4" />
          <Input
            placeholder="Kompaniya, telefon yoki manzil..."
            value={searchValue}
            onChange={(e) => onSearchChange(e.target.value)}
            className="h-11 pr-10 pl-8"
          />
          {isSearching && (
            <div className="absolute top-1/2 right-3 -translate-y-1/2">
              <div className="border-primary h-4 w-4 animate-spin rounded-full border-2 border-t-transparent" />
            </div>
          )}
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" className="h-11" onClick={handleExcel}>
            <FileDown className="mr-2 h-4 w-4" />
            Excel
          </Button>
          <Button className="h-11" onClick={onAddCompany}>
            <Plus className="mr-2 h-4 w-4" />
            Kompaniya
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6">
        <div className="grid gap-1.5">
          <Label className="text-xs">Status</Label>
          <Select value={status} onValueChange={onStatusChange}>
            <SelectTrigger className="h-10 w-full">
              <SelectValue placeholder="Status" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Barchasi</SelectItem>
              <SelectItem value="qarzdor">Qarzdor</SelectItem>
              <SelectItem value="tolangan">To&apos;langan</SelectItem>
              <SelectItem value="muddati_otgan">Muddati o&apos;tgan</SelectItem>
              <SelectItem value="limitdan_otgan">Limitdan o&apos;tgan</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <div className="grid gap-1.5">
          <Label className="text-xs">Sort</Label>
          <Select value={sortBy} onValueChange={onSortChange}>
            <SelectTrigger className="h-10 w-full">
              <SelectValue placeholder="Sort" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="name">Nomi</SelectItem>
              <SelectItem value="amount">Summa</SelectItem>
              <SelectItem value="debt_added_at">Qarz qo&apos;shilgan sana</SelectItem>
              <SelectItem value="paid_at">To&apos;langan sana</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <div className="grid gap-1.5">
          <Label className="text-xs">Sana dan</Label>
          <Input type="date" className="h-10" value={dateFrom} onChange={(e) => onDateFromChange(e.target.value)} />
        </div>
        <div className="grid gap-1.5">
          <Label className="text-xs">Sana gacha</Label>
          <Input type="date" className="h-10" value={dateTo} onChange={(e) => onDateToChange(e.target.value)} />
        </div>
        <div className="grid gap-1.5">
          <Label className="text-xs">Min summa</Label>
          <Input
            type="number"
            className="h-10"
            placeholder="0"
            value={minAmount}
            onChange={(e) => onMinAmountChange(e.target.value)}
          />
        </div>
        <div className="grid gap-1.5">
          <Label className="text-xs">Max summa</Label>
          <Input
            type="number"
            className="h-10"
            placeholder="—"
            value={maxAmount}
            onChange={(e) => onMaxAmountChange(e.target.value)}
          />
        </div>
      </div>
    </section>
  );
}
