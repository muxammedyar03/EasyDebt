"use client";

import * as React from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Trash2, Edit, MoreHorizontal, Search, FileDown, Download, Upload } from "lucide-react";
import { toast } from "sonner";

import { exportToExcel, formatNumberForExcel } from "@/lib/excel-export";
import type { DebtItem } from "@/types/domain";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { DebtorCard } from "@/components/mobile/debtor-card";
import { QuickAddDebt } from "@/features/create-debt/ui";
import { QuickAddPayment } from "@/features/make-payment/ui";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useIsMobile } from "@/hooks/use-mobile";
import { EditDebtorDialog } from "../../default/_components/edit-debtor-dialog";
import { ExportImportDialog } from "./export-import-dialog";
import { DebtorView } from "@/types/view";
import { formatCurrencyUzs, formatDateUz } from "@/lib/format";

// Custom interfaces for transformed data (Decimal -> number)
interface DebtTransformed {
  id: number;
  debtor_id: number;
  amount: number;
  description: string | null;
  items: DebtItem[] | null;
  created_at: Date;
  created_by: number;
}

interface PaymentTransformed {
  id: number;
  debtor_id: number;
  amount: number;
  payment_type: string;
  note: string | null;
  created_at: Date;
  created_by: number;
}

interface Debtor {
  id: number;
  firstName: string;
  lastName: string;
  phone_number: string | null;
  address: string | null;
  total_debt: number;
  last_payment_date: Date | null;
  is_overdue: boolean;
  created_at: Date;
  updated_at: Date;
  created_by: number;
  debts: DebtTransformed[];
  payments: PaymentTransformed[];
}

interface DebtorsTableProps {
  debtors: DebtorView[];
  totalPages: number;
  currentPage: number;
  debtLimit: number;
}

export function DebtorsTable({ debtors, totalPages, currentPage, debtLimit }: DebtorsTableProps) {
  const router = useRouter();
  const isMobile = useIsMobile();
  const searchParams = useSearchParams();
  const [selectedIds, setSelectedIds] = React.useState<number[]>([]);
  const [searchValue, setSearchValue] = React.useState(searchParams?.get("search") || "");
  const [isSearching, setIsSearching] = React.useState(false);
  const [openEditDebtDialog, setOpenEditDebtDialog] = React.useState(false);
  const [selectedDebtorId, setSelectedDebtorId] = React.useState<number | null>(null);
  const [quickDebtDialog, setQuickDebtDialog] = React.useState<{ open: boolean; debtorId: number; debtorName: string }>(
    {
      open: false,
      debtorId: 0,
      debtorName: "",
    },
  );
  const [quickPaymentDialog, setQuickPaymentDialog] = React.useState<{
    open: boolean;
    debtorId: number;
    debtorName: string;
    totalDebt: number;
  }>({
    open: false,
    debtorId: 0,
    debtorName: "",
    totalDebt: 0,
  });
  const [exportDialog, setExportDialog] = React.useState(false);
  const [importDialog, setImportDialog] = React.useState(false);

  // Avoid triggering search on initial mount (which was resetting page to 1 after navigation)
  const isFirstRender = React.useRef(true);

  const getDebtorStatus = (totalDebt: number) => {
    if (totalDebt <= 0) {
      return {
        label: "To'langan",
        variant: "default" as const,
        color: "text-green-600",
        className: "bg-green-600/20 text-green-700 dark:text-green-500",
      };
    } else if (totalDebt > debtLimit) {
      return {
        label: "Limitdan oshgan",
        variant: "default" as const,
        color: "text-red-600",
        className: "bg-red-600/15 text-red-700 dark:text-red-500",
      };
    } else {
      return {
        label: "Qarzdor",
        variant: "secondary" as const,
        color: "text-yellow-600",
        className: "bg-yellow-600/20 text-yellow-800 dark:text-yellow-500",
      };
    }
  };

  const handleSearch = React.useCallback(
    (value: string) => {
      const params = new URLSearchParams(searchParams?.toString() ?? "");
      const currentSearch = params.get("search") || "";
      if (value) {
        params.set("search", value);
      } else {
        params.delete("search");
      }
      // Only reset to page 1 if search value actually changed
      if (value !== currentSearch) {
        params.set("page", "1");
      }
      router.push(`?${params.toString()}`);
    },
    [router, searchParams],
  );

  // Debounce search (skip on first render to prevent resetting page on navigation)
  React.useEffect(() => {
    if (isFirstRender.current) {
      isFirstRender.current = false;
      return;
    }
    // If URL already contains the same search value, do nothing
    const urlSearch = searchParams?.get("search") || "";
    if (urlSearch === searchValue) {
      setIsSearching(false);
      return;
    }

    setIsSearching(true);
    const timer = setTimeout(() => {
      handleSearch(searchValue);
      setIsSearching(false);
    }, 300); // 300ms - tezroq

    return () => clearTimeout(timer);
  }, [searchValue, handleSearch, searchParams]);

  // Keep input in sync with URL search param without forcing page reset
  React.useEffect(() => {
    const urlSearch = searchParams?.get("search") || "";
    setSearchValue((prev) => (prev === urlSearch ? prev : urlSearch));
  }, [searchParams]);

  const handleSort = (sortBy: string) => {
    const params = new URLSearchParams(searchParams?.toString() ?? "");
    const currentSortBy = params.get("sortBy");
    const currentSortOrder = params.get("sortOrder") || "desc";

    if (currentSortBy === sortBy) {
      params.set("sortOrder", currentSortOrder === "asc" ? "desc" : "asc");
    } else {
      params.set("sortBy", sortBy);
      params.set("sortOrder", "asc");
    }

    router.push(`?${params.toString()}`);
  };

  const handleStatusFilter = (status: string) => {
    const params = new URLSearchParams(searchParams?.toString() ?? "");
    const current = params.get("status") || "all";
    // If status is the same, do nothing to avoid resetting page
    if (status === current) return;
    if (status === "all") {
      params.delete("status");
    } else {
      params.set("status", status);
    }
    params.set("page", "1");
    router.push(`?${params.toString()}`);
  };

  const handlePageChange = (page: number) => {
    const params = new URLSearchParams(searchParams?.toString() ?? "");
    params.set("page", page.toString());
    router.push(`?${params.toString()}`);
  };

  const handleSelectAll = () => {
    if (selectedIds.length === debtors.length) {
      setSelectedIds([]);
    } else {
      setSelectedIds(debtors.map((d) => d.id));
    }
  };

  const handleSelectOne = (id: number) => {
    if (selectedIds.includes(id)) {
      setSelectedIds(selectedIds.filter((selectedId) => selectedId !== id));
    } else {
      setSelectedIds([...selectedIds, id]);
    }
  };

  const handleBulkDelete = async () => {
    if (selectedIds.length === 0) return;

    if (confirm(`${selectedIds.length} ta qarzdorni o'chirmoqchimisiz?`)) {
      try {
        const response = await fetch("/api/debtors/bulk-delete", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ ids: selectedIds }),
        });

        if (response.ok) {
          setSelectedIds([]);
          router.refresh();
        }
      } catch (error) {
        console.error("Error deleting debtors:", error);
      }
    }
  };

  const handleDelete = async (id: number) => {
    if (confirm("Qarzdorni o'chirmoqchimisiz?")) {
      try {
        const response = await fetch(`/api/debtors/${id}`, {
          method: "DELETE",
        });

        if (response.ok) {
          router.refresh();
        }
      } catch (error) {
        console.error("Error deleting debtor:", error);
      }
    }
  };

  const handleExport = async () => {
    try {
      toast.loading("Excel fayl tayyorlanmoqda...");

      // Get current filters
      const params = new URLSearchParams(searchParams?.toString() ?? "");
      const search = params.get("search") || "";
      const status = params.get("status") || "all";

      // Fetch all data for export
      const response = await fetch(`/api/debtors/export?search=${encodeURIComponent(search)}&status=${status}`);

      if (!response.ok) {
        throw new Error("Export failed");
      }

      const data = await response.json();
      const debtors = data.debtors;

      // Prepare export data
      const exportData = {
        headers: ["ID", "Ism", "Familiya", "Telefon", "Manzil", "Jami qarz", "Jami to'lovlar"],
        rows: debtors.map(
          (
            debtor: Debtor & {
              total_debts?: number;
              total_payments?: number;
              status: string;
              first_name?: string;
              last_name?: string;
            },
          ) => [
            debtor.id,
            debtor.first_name || debtor.firstName,
            debtor.last_name || debtor.lastName,
            debtor.phone_number || "-",
            debtor.address || "-",
            formatNumberForExcel(debtor.total_debt),
            formatNumberForExcel(debtor.total_payments || 0),
          ],
        ),
        filename: `qarzdorlar_${new Date().toISOString().split("T")[0]}_${status}`,
      };

      await exportToExcel(exportData);
      toast.dismiss();
      toast.success(`${debtors.length} ta qarzdor Excel fayliga yuklandi`);
    } catch (error) {
      console.error("Export error:", error);
      toast.dismiss();
      toast.error("Excel fayliga yuklashda xatolik yuz berdi");
    }
  };

  const handleAddDebt = (debtorId: number) => {
    const debtor = debtors.find((d) => d.id === debtorId);
    if (debtor) {
      setQuickDebtDialog({
        open: true,
        debtorId,
        debtorName: `${debtor.firstName} ${debtor.lastName}`,
      });
    }
  };

  const handleAddPayment = (debtorId: number) => {
    const debtor = debtors.find((d) => d.id === debtorId);
    if (debtor) {
      setQuickPaymentDialog({
        open: true,
        debtorId,
        debtorName: `${debtor.firstName} ${debtor.lastName}`,
        totalDebt: debtor.totalDebt,
      });
    }
  };

  return (
    <>
      <div className="space-y-4">
        {/* Filters */}
        <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
          <div className="flex flex-1 items-center justify-between gap-2">
            <div className="relative flex-1 lg:max-w-xl">
              <Search className="text-muted-foreground absolute top-4 left-2.5 h-4 w-4" />
              <Input
                placeholder="Ism, familiya yoki telefon..."
                value={searchValue}
                onChange={(e) => setSearchValue(e.target.value)}
                className="h-12 w-full pr-10 pl-8"
              />
              {isSearching && (
                <div className="absolute top-1/2 right-3 -translate-y-1/2">
                  <div className="border-primary h-5 w-5 animate-spin rounded-full border-2 border-t-transparent" />
                </div>
              )}
            </div>
            <div className="flex items-center gap-2">
              {selectedIds.length > 0 && (
                <Button variant="destructive" size="sm" onClick={handleBulkDelete} className="hidden md:flex">
                  <Trash2 className="mr-2 h-4 w-4" />
                  O&apos;chirish ({selectedIds.length})
                </Button>
              )}
              <Button variant="outline" className="h-12 gap-2" size="sm" onClick={() => setImportDialog(true)}>
                <Upload className="h-4 w-4" />
                <span className="hidden sm:inline">Import</span>
              </Button>
              <Button variant="outline" className="h-12 gap-2" size="sm" onClick={() => setExportDialog(true)}>
                <Download className="h-4 w-4" />
                <span className="hidden sm:inline">Export</span>
              </Button>
              <Button
                variant="outline"
                className="h-12 w-12 gap-2 bg-blue-500 text-white sm:w-auto dark:bg-blue-600"
                size="sm"
                onClick={handleExport}
              >
                <FileDown className="h-4 w-4" />
                <span className="hidden sm:inline">Excel</span>
              </Button>
            </div>
          </div>
        </div>
        <div className="flex flex-wrap items-center justify-between gap-2">
          {isMobile ? (
            <Select value={searchParams?.get("status") || "all"} onValueChange={handleStatusFilter}>
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
            <Tabs value={searchParams?.get("status") || "all"} onValueChange={handleStatusFilter}>
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

        {/* Pagination (Top - Mobile) */}
        <div className="flex items-center justify-between md:hidden">
          <div className="text-muted-foreground text-sm">
            {currentPage} / {totalPages} sahifa
          </div>
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => handlePageChange(currentPage - 1)}
              disabled={currentPage === 1}
            >
              Oldingi
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => handlePageChange(currentPage + 1)}
              disabled={currentPage === totalPages}
            >
              Keyingi
            </Button>
          </div>
        </div>

        {/* Mobile Card View */}
        <div className="grid gap-4 md:hidden">
          {debtors.length === 0 ? (
            <div className="text-muted-foreground py-8 text-center">Ma&apos;lumot topilmadi</div>
          ) : (
            debtors.map((debtor) => (
              <DebtorCard
                key={debtor.id}
                debtor={debtor}
                debtLimit={debtLimit}
                onAddDebt={handleAddDebt}
                onAddPayment={handleAddPayment}
                onDelete={handleDelete}
              />
            ))
          )}
        </div>

        {/* Desktop Table View */}
        <div className="hidden rounded-md border md:block">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-12">
                  <Checkbox
                    checked={selectedIds.length === debtors.length && debtors.length > 0}
                    onCheckedChange={handleSelectAll}
                  />
                </TableHead>
                <TableHead className="hover:bg-muted/50 cursor-pointer select-none" onClick={() => handleSort("name")}>
                  Ism Familiya{" "}
                  {searchParams?.get("sortBy") === "name" && (searchParams?.get("sortOrder") === "asc" ? "↑" : "↓")}
                </TableHead>
                <TableHead>Telefon</TableHead>
                <TableHead className="hover:bg-muted/50 cursor-pointer select-none" onClick={() => handleSort("debt")}>
                  Qarz summasi{" "}
                  {searchParams?.get("sortBy") === "debt" && (searchParams?.get("sortOrder") === "asc" ? "↑" : "↓")}
                </TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="hover:bg-muted/50 cursor-pointer select-none" onClick={() => handleSort("date")}>
                  Sana{" "}
                  {searchParams?.get("sortBy") === "date" && (searchParams?.get("sortOrder") === "asc" ? "↑" : "↓")}
                </TableHead>
                <TableHead className="w-12"></TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {debtors.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={7} className="text-center">
                    Ma&apos;lumot topilmadi
                  </TableCell>
                </TableRow>
              ) : (
                debtors.map((debtor) => {
                  const status = getDebtorStatus(debtor.totalDebt);
                  return (
                    <TableRow key={debtor.id}>
                      <TableCell>
                        <Checkbox
                          checked={selectedIds.includes(debtor.id)}
                          onCheckedChange={() => handleSelectOne(debtor.id)}
                        />
                      </TableCell>
                      <TableCell
                        className="font-medium"
                        onClick={() => router.push(`/dashboard/default/debitor/${debtor.externalId}`)}
                      >
                        {debtor.firstName} {debtor.lastName}
                      </TableCell>
                      <TableCell>{debtor.phoneNumber || "-"}</TableCell>
                      <TableCell className={status.color}>{formatCurrencyUzs(debtor.totalDebt)}</TableCell>
                      <TableCell className="flex items-center gap-2">
                        <Badge
                          variant="default"
                          className={`h-5 w-5 rounded-full ${debtor.isOverdue ? "bg-red-500" : "bg-green-500"}`}
                        ></Badge>
                        <Badge
                          variant={status.variant}
                          className={`h-7 rounded-xl px-2 font-medium ${status.className}`}
                        >
                          {status.label}
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
                            <DropdownMenuItem
                              onClick={() => {
                                setSelectedDebtorId(debtor.id);
                                setOpenEditDebtDialog(true);
                              }}
                            >
                              <Edit className="mr-2 h-4 w-4" />
                              Tahrirlash
                            </DropdownMenuItem>
                            <DropdownMenuItem onClick={() => handleDelete(debtor.id)} className="text-red-600">
                              <Trash2 className="mr-2 h-4 w-4" />
                              O&apos;chirish
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

        {/* Edit Dialog - faqat tanlangan debtor uchun */}
        {selectedDebtorId && (
          <EditDebtorDialog
            debtor={debtors.find((d) => d.id === selectedDebtorId)!}
            open={openEditDebtDialog}
            onOpenChange={(open) => {
              setOpenEditDebtDialog(open);
              if (!open) setSelectedDebtorId(null);
            }}
            onSuccess={() => {
              router.refresh();
            }}
          />
        )}

        {/* Pagination */}
        <div className="flex items-center justify-between">
          <div className="text-muted-foreground text-sm">
            {currentPage} / {totalPages} sahifa
          </div>
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => handlePageChange(currentPage - 1)}
              disabled={currentPage === 1}
            >
              Oldingi
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => handlePageChange(currentPage + 1)}
              disabled={currentPage === totalPages}
            >
              Keyingi
            </Button>
          </div>
        </div>
      </div>

      {/* Quick Add Dialogs */}
      <QuickAddDebt
        open={quickDebtDialog.open}
        onOpenChange={(open) => setQuickDebtDialog({ ...quickDebtDialog, open })}
        debtorId={quickDebtDialog.debtorId}
        debtorName={quickDebtDialog.debtorName}
      />

      <QuickAddPayment
        open={quickPaymentDialog.open}
        onOpenChange={(open) => setQuickPaymentDialog({ ...quickPaymentDialog, open })}
        debtorId={quickPaymentDialog.debtorId}
        debtorName={quickPaymentDialog.debtorName}
        totalDebt={quickPaymentDialog.totalDebt}
      />

      {/* Export/Import Dialogs */}
      <ExportImportDialog open={exportDialog} onOpenChange={setExportDialog} mode="export" />
      <ExportImportDialog open={importDialog} onOpenChange={setImportDialog} mode="import" />
    </>
  );
}
