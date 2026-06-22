"use client";

import { Edit, MoreHorizontal, Trash2 } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { getDebtorDebtLimitBandPresentation } from "@/lib/debtors";
import type { DebtorView } from "@/types/view";
import { formatCurrencyUzs, formatDateUz } from "@/lib/format";
import { t } from "@/lib/i18n";

type DebtorsTableDesktopProps = {
  debtors: DebtorView[];
  debtLimit: number;
  selectedIds: number[];
  sortBy: string | null;
  sortOrder: string | null;
  onSort: (column: "name" | "debt" | "date") => void;
  onToggleAll: () => void;
  onToggleOne: (id: number) => void;
  onEdit: (debtorId: number) => void;
  onDelete: (debtorId: number) => void;
  onNavigateToDebtor: (externalId: string) => void;
};

function sortIndicator(active: boolean, order: string | null) {
  if (!active) return null;
  return order === "asc" ? "↑" : "↓";
}

export function DebtorsTableDesktop({
  debtors,
  debtLimit,
  selectedIds,
  sortBy,
  sortOrder,
  onSort,
  onToggleAll,
  onToggleOne,
  onEdit,
  onDelete,
  onNavigateToDebtor,
}: DebtorsTableDesktopProps) {
  return (
    <div className="hidden rounded-md border md:block">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead className="w-12">
              <Checkbox
                checked={selectedIds.length === debtors.length && debtors.length > 0}
                onCheckedChange={onToggleAll}
              />
            </TableHead>
            <TableHead className="hover:bg-muted/50 cursor-pointer select-none" onClick={() => onSort("name")}>
              {t("debtorsTable.fullName")} {sortIndicator(sortBy === "name", sortOrder)}
            </TableHead>
            <TableHead>{t("debtors.phone")}</TableHead>
            <TableHead className="hover:bg-muted/50 cursor-pointer select-none" onClick={() => onSort("debt")}>
              {t("debtorsTable.debtAmount")} {sortIndicator(sortBy === "debt", sortOrder)}
            </TableHead>
            <TableHead>{t("common.status")}</TableHead>
            <TableHead className="hover:bg-muted/50 cursor-pointer select-none" onClick={() => onSort("date")}>
              {t("debtorsTable.date")} {sortIndicator(sortBy === "date", sortOrder)}
            </TableHead>
            <TableHead className="w-12"></TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {debtors.length === 0 ? (
            <TableRow>
              <TableCell colSpan={7} className="text-center">
                {t("debtors.noData")}
              </TableCell>
            </TableRow>
          ) : (
            debtors.map((debtor) => {
              const band = getDebtorDebtLimitBandPresentation(debtor.totalDebt, debtLimit);
              return (
                <TableRow key={debtor.id}>
                  <TableCell>
                    <Checkbox
                      checked={selectedIds.includes(debtor.id)}
                      onCheckedChange={() => onToggleOne(debtor.id)}
                    />
                  </TableCell>
                  <TableCell
                    className="cursor-pointer font-medium"
                    onClick={() => onNavigateToDebtor(debtor.externalId)}
                  >
                    {debtor.firstName} {debtor.lastName}
                  </TableCell>
                  <TableCell>{debtor.phoneNumber || "-"}</TableCell>
                  <TableCell className={band.amountClassName}>{formatCurrencyUzs(debtor.totalDebt)}</TableCell>
                  <TableCell className="flex items-center gap-2">
                    <Badge
                      variant="default"
                      className={`h-5 w-5 rounded-full ${debtor.isOverdue ? "bg-red-500" : "bg-green-500"}`}
                    />
                    <Badge variant={band.variant} className={`h-7 rounded-xl px-2 font-medium ${band.badgeClassName}`}>
                      {band.label}
                    </Badge>
                  </TableCell>
                  <TableCell>{formatDateUz(new Date(debtor.createdAt))}</TableCell>
                  <TableCell>
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="icon">
                          <MoreHorizontal className="h-4 w-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem onClick={() => onEdit(debtor.id)}>
                          <Edit className="mr-2 h-4 w-4" />
                          {t("common.edit")}
                        </DropdownMenuItem>
                        <DropdownMenuItem onClick={() => onDelete(debtor.id)} className="text-red-600">
                          <Trash2 className="mr-2 h-4 w-4" />
                          {t("common.delete")}
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </TableCell>
                </TableRow>
              );
            })
          )}
        </TableBody>
      </Table>
    </div>
  );
}
