"use client";

import * as React from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Trash2, Edit, MoreHorizontal, Search, FileDown } from "lucide-react";
import { toast } from "sonner";

import { exportToExcel, formatNumberForExcel } from "@/lib/excel-export";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Badge } from "@/components/ui/badge";
import { DebtItem } from "@/types/types";

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
  first_name: string;
  last_name: string;
  phone_number: string | null;
  address: string | null;
  total_debt: number;
  created_at: Date;
  updated_at: Date;
  created_by: number;
  debts: DebtTransformed[];
  payments: PaymentTransformed[];
}

interface DebtorsTableProps {
  debtors: Debtor[];
  totalPages: number;
  currentPage: number;
  debtLimit: number;
}

export function DebtorsTable({ debtors, totalPages, currentPage, debtLimit }: DebtorsTableProps) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [selectedIds, setSelectedIds] = React.useState<number[]>([]);
  const [searchValue, setSearchValue] = React.useState(searchParams.get("search") || "");

  const getDebtorStatus = (totalDebt: number) => {
    if (totalDebt <= 0) {
      return { label: "To'langan", variant: "default" as const, color: "text-green-600" };
    } else if (totalDebt > debtLimit) {
      return { label: "Limitdan oshgan", variant: "destructive" as const, color: "text-red-600" };
    } else {
      return { label: "Qarzdor", variant: "secondary" as const, color: "text-yellow-600" };
    }
  };

  const handleSearch = React.useCallback(
    (value: string) => {
      const params = new URLSearchParams(searchParams.toString());
      if (value) {
        params.set("search", value);
      } else {
        params.delete("search");
      }
      params.set("page", "1");
      router.push(`?${params.toString()}`);
    },
    [router, searchParams]
  );

  // Debounce search
  React.useEffect(() => {
    const timer = setTimeout(() => {
      handleSearch(searchValue);
    }, 500); // 500ms delay

    return () => clearTimeout(timer);
  }, [searchValue, handleSearch]);

  const handleSort = (sortBy: string) => {
    const params = new URLSearchParams(searchParams.toString());
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
    const params = new URLSearchParams(searchParams.toString());
    if (status === "all") {
      params.delete("status");
    } else {
      params.set("status", status);
    }
    params.set("page", "1");
    router.push(`?${params.toString()}`);
  };

  const handlePageChange = (page: number) => {
    const params = new URLSearchParams(searchParams.toString());
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

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat("uz-UZ").format(amount) + " so'm";
  };

  const handleExport = async () => {
    try {
      toast.loading("Excel fayl tayyorlanmoqda...");

      // Get current filters
      const params = new URLSearchParams(searchParams.toString());
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
        headers: [
          "ID",
          "Ism",
          "Familiya",
          "Telefon",
          "Manzil",
          "Jami qarz",
          "Jami berilgan qarz",
          "Jami to'lovlar",
          "Status",
          "Yaratilgan sana",
        ],
        rows: debtors.map((debtor: Debtor & { total_payment: number; status: string }) => [
          debtor.id,
          debtor.first_name,
          debtor.last_name,
          debtor.phone_number || "-",
          debtor.address || "-",
          formatNumberForExcel(debtor.total_debt),
          formatNumberForExcel(debtor.total_debt),
          formatNumberForExcel(debtor.total_payment),
          debtor.status,
          debtor.created_at,
        ]),
        filename: `qarzdorlar_${new Date().toISOString().split("T")[0]}`,
      };

      exportToExcel(exportData);
      toast.dismiss();
      toast.success(`${debtors.length} ta qarzdor Excel fayliga yuklandi`);
    } catch (error) {
      console.error("Export error:", error);
      toast.dismiss();
      toast.error("Excel fayliga yuklashda xatolik yuz berdi");
    }
  };

  return (
    <div className="space-y-4">
      {/* Filters */}
      <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <div className="flex flex-1 items-center gap-2">
          <div className="relative flex-1 md:max-w-sm">
            <Search className="text-muted-foreground absolute top-2.5 left-2.5 h-4 w-4" />
            <Input
              placeholder="Ism, familiya yoki telefon..."
              value={searchValue}
              onChange={(e) => setSearchValue(e.target.value)}
              className="pl-8"
            />
          </div>
        </div>

        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" onClick={handleExport} className="gap-2">
            <FileDown className="h-4 w-4" />
            Excel
          </Button>

          <Select value={searchParams.get("status") || "all"} onValueChange={handleStatusFilter}>
            <SelectTrigger className="w-[180px]">
              <SelectValue placeholder="Status" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Barchasi</SelectItem>
              <SelectItem value="qarzdor">Qarzdor</SelectItem>
              <SelectItem value="limitdan_oshgan">Limitdan oshgan</SelectItem>
              <SelectItem value="tolangan">To&apos;langan</SelectItem>
            </SelectContent>
          </Select>

          {selectedIds.length > 0 && (
            <Button variant="destructive" onClick={handleBulkDelete}>
              <Trash2 className="mr-2 h-4 w-4" />
              O&apos;chirish ({selectedIds.length})
            </Button>
          )}
        </div>
      </div>

      {/* Table */}
      <div className="rounded-md border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="w-12">
                <Checkbox
                  checked={selectedIds.length === debtors.length && debtors.length > 0}
                  onCheckedChange={handleSelectAll}
                />
              </TableHead>
              <TableHead className="cursor-pointer" onClick={() => handleSort("name")}>
                Ism Familiya
              </TableHead>
              <TableHead>Telefon</TableHead>
              <TableHead className="cursor-pointer" onClick={() => handleSort("amount")}>
                Qarz summasi
              </TableHead>
              <TableHead>Status</TableHead>
              <TableHead className="cursor-pointer" onClick={() => handleSort("created_at")}>
                Sana
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
                const status = getDebtorStatus(debtor.total_debt);
                return (
                  <TableRow key={debtor.id}>
                    <TableCell>
                      <Checkbox
                        checked={selectedIds.includes(debtor.id)}
                        onCheckedChange={() => handleSelectOne(debtor.id)}
                      />
                    </TableCell>
                    <TableCell className="font-medium">
                      {debtor.first_name} {debtor.last_name}
                    </TableCell>
                    <TableCell>{debtor.phone_number || "-"}</TableCell>
                    <TableCell className={status.color}>{formatCurrency(debtor.total_debt)}</TableCell>
                    <TableCell>
                      <Badge variant={status.variant}>{status.label}</Badge>
                    </TableCell>
                    <TableCell>{new Date(debtor.created_at).toLocaleDateString("uz-UZ")}</TableCell>
                    <TableCell>
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" size="icon">
                            <MoreHorizontal className="h-4 w-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem onClick={() => router.push(`/dashboard/default/debitor/${debtor.id}`)}>
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
  );
}
