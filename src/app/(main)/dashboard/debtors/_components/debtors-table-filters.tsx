"use client";

import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";

type DebtorsTableFiltersProps = {
  isMobile: boolean;
  statusValue: string;
  onStatusChange: (status: string) => void;
};

export function DebtorsTableFilters({ isMobile, statusValue, onStatusChange }: DebtorsTableFiltersProps) {
  return (
    <div className="flex flex-wrap items-center justify-between gap-2">
      {isMobile ? (
        <Select value={statusValue} onValueChange={onStatusChange}>
          <SelectTrigger className="!h-12 w-[140px] sm:w-[180px]">
            <SelectValue placeholder="Status" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Barchasi</SelectItem>
            <SelectItem value="qarzdor">Qarzdor</SelectItem>
            <SelectItem value="muddati_otgan">Muddati o&apos;tgan</SelectItem>
            <SelectItem value="limitdan_oshgan">Limitdan oshgan</SelectItem>
            <SelectItem value="tolangan">To&apos;langan</SelectItem>
          </SelectContent>
        </Select>
      ) : (
        <Tabs value={statusValue} onValueChange={onStatusChange}>
          <TabsList className="grid h-12 w-full grid-cols-2 sm:grid-cols-5">
            <TabsTrigger value="all">Barchasi</TabsTrigger>
            <TabsTrigger value="qarzdor">Qarzdor</TabsTrigger>
            <TabsTrigger value="muddati_otgan">Muddati o&apos;tgan</TabsTrigger>
            <TabsTrigger value="limitdan_oshgan" className="text-xs sm:text-sm">
              Limitdan oshgan
            </TabsTrigger>
            <TabsTrigger value="tolangan">To&apos;langan</TabsTrigger>
          </TabsList>
        </Tabs>
      )}
    </div>
  );
}
