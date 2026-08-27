"use client";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Search, X } from "lucide-react";
import { useTranslations } from "next-intl";
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
  const t = useTranslations("notifications");
  const tCommon = useTranslations("common");

  const handleFilterChange = (value: string) => {
    if (value === "read:all") {
      updateParams({ read: undefined, type: undefined, page: "1" });
    } else if (value === "read:unread") {
      updateParams({ read: "false", type: undefined, page: "1" });
    } else if (value === "read:read") {
      updateParams({ read: "true", type: undefined, page: "1" });
    } else if (value.startsWith("type:")) {
      const typeValue = value.replace("type:", "");
      updateParams({ type: typeValue, read: undefined, page: "1" });
    }
  };

  const getCurrentFilterValue = () => {
    if (type) {
      if (type === "OVERDUE_PAYMENT") return "type:OVERDUE_PAYMENT";
      if (type === "DEBT_LIMIT_EXCEEDED") return "type:DEBT_LIMIT_EXCEEDED";
      if (type === "HOSTING_REMINDER") return "type:HOSTING_REMINDER";
      if (type === "PAYMENT_REMINDER") return "type:PAYMENT_REMINDER";
    }

    if (read === "false") return "read:unread";
    if (read === "true") return "read:read";

    return "read:all";
  };

  return (
    <div className="flex flex-col gap-y-4">
      <div className="flex flex-wrap items-center gap-2">
        <div className="flex min-w-[240px] flex-1 items-center gap-1">
          <Input
            placeholder={`${tCommon("search")}...`}
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
            {tCommon("search")}
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
            <SelectValue placeholder={t("type")} />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="__ALL__">{tCommon("all")}</SelectItem>
            <SelectItem value="OVERDUE_PAYMENT">{t("typeOverdue")}</SelectItem>
            <SelectItem value="DEBT_LIMIT_EXCEEDED">{t("typeLimitExceeded")}</SelectItem>
            <SelectItem value="HOSTING_REMINDER">{t("typeHosting")}</SelectItem>
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
            <SelectValue placeholder={t("status")} />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">{tCommon("all")}</SelectItem>
            <SelectItem value="unread">{t("unread")}</SelectItem>
            <SelectItem value="read">{t("read")}</SelectItem>
          </SelectContent>
        </Select>
      </div>
      <div className="hidden w-full lg:flex">
        <SortToggleGroup
          className="bg-card border-border h-12 w-auto rounded-md border p-1"
          onToggle={handleFilterChange}
          sortOptions={[
            { key: "read:all", label: tCommon("all") },
            { key: "read:unread", label: t("unread") },
            { key: "read:read", label: t("read") },
            { key: "type:OVERDUE_PAYMENT", label: t("typeOverdue") },
            { key: "type:DEBT_LIMIT_EXCEEDED", label: t("typeLimitExceeded") },
            { key: "type:HOSTING_REMINDER", label: t("typeHosting") },
          ]}
          currentSortField={getCurrentFilterValue()}
          currentSortOrder={null}
        />
      </div>
    </div>
  );
}
