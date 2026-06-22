"use client";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Search, X } from "lucide-react";
import { SortToggleGroup } from "../../customers/_components/sort-toggle-group";

interface NotificationsFiltersProps {
  search: string;
  setSearch: (search: string) => void;
  updateParams: (params: Record<string, string | undefined>) => void;
  type: string;
  read: string;
}

export function NotificationsFilters(props: NotificationsFiltersProps) {
  const { search, setSearch, updateParams, type, read } = props;

  const handleFilterChange = (value: string) => {
    // Read filter values
    if (value === "read:all") {
      updateParams({ read: undefined, type: undefined, page: "1" });
    } else if (value === "read:unread") {
      updateParams({ read: "false", type: undefined, page: "1" });
    } else if (value === "read:read") {
      updateParams({ read: "true", type: undefined, page: "1" });
    }
    // Type filter values
    else if (value.startsWith("type:")) {
      const typeValue = value.replace("type:", "");
      updateParams({ type: typeValue, read: undefined, page: "1" });
    }
  };

  const getCurrentFilterValue = () => {
    // Check type filter first (if type is set, it takes priority)
    if (type) {
      if (type === "OVERDUE_PAYMENT") return "type:OVERDUE_PAYMENT";
      if (type === "DEBT_LIMIT_EXCEEDED") return "type:DEBT_LIMIT_EXCEEDED";
      if (type === "HOSTING_REMINDER") return "type:HOSTING_REMINDER";
      if (type === "PAYMENT_REMINDER") return "type:PAYMENT_REMINDER";
    }

    // Check read filter
    if (read === "false") return "read:unread";
    if (read === "true") return "read:read";

    // Default: all read
    return "read:all";
  };

  return (
    <div className="flex flex-col gap-y-4">
      <div className="flex flex-wrap items-center gap-2">
        <div className="flex min-w-[240px] flex-1 items-center gap-1">
          <Input
            placeholder="Qidirish..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") {
                const value = (e.target as HTMLInputElement).value;
                updateParams({ q: value || undefined, page: "1" });
              }
            }}
            className="border-border h-10 border bg-white text-xs md:max-w-1/2 md:text-sm"
          />
          <Button
            variant="default"
            onClick={() => updateParams({ q: search || undefined, page: "1" })}
            className="h-10 border border-blue-600/20 bg-blue-600/10 text-xs text-blue-600 hover:bg-blue-600/15 md:text-sm dark:border-blue-500/20 dark:bg-blue-500/15 dark:text-blue-500 dark:hover:bg-blue-500/20"
          >
            <Search />
            Qidirish
          </Button>
          <Button
            variant="outline"
            className="h-10 w-10 border-red-600/20 bg-red-600/10 text-xs text-red-600 hover:bg-red-600/20 hover:text-red-600 md:text-sm"
            onClick={() => {
              setSearch("");
              updateParams({ q: undefined, type: undefined, read: undefined, page: "1" });
            }}
          >
            <X />
          </Button>
        </div>
      </div>
      <div className="flex items-center gap-2 lg:hidden">
        <Select
          value={type ?? "__ALL__"}
          onValueChange={(v) => updateParams({ type: v === "__ALL__" ? undefined : v, page: "1" })}
        >
          <SelectTrigger className="border-border w-32 border text-xs md:w-[200px] md:text-sm">
            <SelectValue placeholder="Turi" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="__ALL__">Hammasi</SelectItem>
            <SelectItem value="OVERDUE_PAYMENT">Muddati o&apos;tgan</SelectItem>
            <SelectItem value="DEBT_LIMIT_EXCEEDED">Limitdan oshdi</SelectItem>
            <SelectItem value="HOSTING_REMINDER">Hosting eslatma</SelectItem>
          </SelectContent>
        </Select>
        <Select
          value={read === "false" ? "unread" : read === "true" ? "read" : "all"}
          onValueChange={(v) => {
            if (v === "all") {
              updateParams({ read: undefined, page: "1" });
            } else if (v === "unread") {
              updateParams({ read: "false", page: "1" });
            } else if (v === "read") {
              updateParams({ read: "true", page: "1" });
            }
          }}
        >
          <SelectTrigger className="border-border w-32 border text-xs md:w-[160px] md:text-sm">
            <SelectValue placeholder="Holati" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Hammasi</SelectItem>
            <SelectItem value="unread">O&apos;qilmagan</SelectItem>
            <SelectItem value="read">O&apos;qilgan</SelectItem>
          </SelectContent>
        </Select>
      </div>
      <div className="hidden w-full lg:flex">
        <SortToggleGroup
          className="bg-card border-border h-12 w-auto rounded-md border p-1"
          onToggle={handleFilterChange}
          sortOptions={[
            // Read filters
            { key: "read:all", label: "Hammasi" },
            { key: "read:unread", label: "O'qilmagan" },
            { key: "read:read", label: "O'qilgan" },
            // Type filters
            { key: "type:OVERDUE_PAYMENT", label: "Muddati o'tgan" },
            { key: "type:DEBT_LIMIT_EXCEEDED", label: "Limitdan oshdi" },
            { key: "type:HOSTING_REMINDER", label: "Hosting eslatma" },
          ]}
          currentSortField={getCurrentFilterValue()}
          currentSortOrder={null}
        />
      </div>
    </div>
  );
}
