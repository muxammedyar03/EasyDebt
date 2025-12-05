"use client";

import { ArrowDownWideNarrow, ArrowUpDown, ArrowUpNarrowWide, ListFilter } from "lucide-react";

import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

interface SortToggleGroupProps {
  currentSortField: string | null;
  currentSortOrder: "asc" | "desc" | null;
  onToggle: (field: string) => void;
  sortOptions: { key: string; label: string }[];
  className?: string;
}

export function SortToggleGroup({
  currentSortField,
  currentSortOrder,
  onToggle,
  sortOptions,
  className,
}: SortToggleGroupProps) {
  return (
    <div className={cn("flex gap-2", className)}>
      {sortOptions.map((option) => {
        const isActive = currentSortField === option.key;
        const stateLabel = !isActive ? (
          <ListFilter />
        ) : currentSortOrder === "asc" ? (
          <ArrowUpNarrowWide className="!h-5 !w-5 text-blue-500" />
        ) : currentSortOrder === "desc" ? (
          <ArrowDownWideNarrow className="!h-5 !w-5 text-orange-500" />
        ) : (
          ""
        );

        return (
          <Button
            key={option.key}
            variant={"outline"}
            className={cn("h-full gap-1 px-2")}
            onClick={() => onToggle(option.key)}
          >
            {stateLabel && <span>{stateLabel}</span>}
            <span>{option.label}</span>
          </Button>
        );
      })}
    </div>
  );
}
