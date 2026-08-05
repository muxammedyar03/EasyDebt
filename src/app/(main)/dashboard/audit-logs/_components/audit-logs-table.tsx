"use client";

import * as React from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Search, FileDown, ChevronLeft, ChevronRight } from "lucide-react";
import { toast } from "sonner";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { AuditLogTableProps } from "@/types/types";
import { useTableUtils } from "../utils/useTableUtils";
import { AuditLogFilters } from "./audit-log-filters";
import { exportToExcel } from "@/lib/excel-export";

interface ExportedAuditLog {
  id: number;
  sana: string;
  foydalanuvchi: string;
  email: string;
  harakat: string;
  entity_turi: string;
  entity_id: number | string;
  ip_address: string;
}

export interface AuditLogsTableProps {
  logs: AuditLogTableProps[];
  totalPages: number;
  currentPage: number;
  totalCount: number;
}

export function AuditLogsTable({ logs, totalPages, currentPage, totalCount }: AuditLogsTableProps) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { getActionBadge, getEntityTypeName, formatDate } = useTableUtils();

  const [searchValue, setSearchValue] = React.useState(searchParams?.get("search") || "");
  const [isExporting, setIsExporting] = React.useState(false);

  // Search handler
  const handleSearch = React.useCallback(() => {
    const params = new URLSearchParams(searchParams?.toString() ?? "");
    if (searchValue) {
      params.set("search", searchValue);
    } else {
      params.delete("search");
    }
    params.set("page", "1");
    router.push(`?${params.toString()}`);
  }, [searchValue, searchParams, router]);

  // Pagination handler
  const handlePageChange = (page: number) => {
    const params = new URLSearchParams(searchParams?.toString() ?? "");
    params.set("page", page.toString());
    router.push(`?${params.toString()}`);
  };

  // Export handler
  const handleExport = async () => {
    try {
      setIsExporting(true);
      toast.loading("Excel fayl tayyorlanmoqda...");

      const params = searchParams?.toString() ?? "";
      const response = await fetch(`/api/audit-logs/export?${params}`);

      if (!response.ok) {
        throw new Error("Export failed");
      }

      const data = await response.json();
      const logs: ExportedAuditLog[] = data.logs;

      // Prepare export data
      const exportData = {
        headers: ["ID", "Sana", "Foydalanuvchi", "Email", "Harakat", "Entity turi", "Entity ID", "IP Address"],
        rows: logs.map((log) => [
          log.id,
          log.sana,
          log.foydalanuvchi,
          log.email,
          log.harakat,
          log.entity_turi,
          log.entity_id,
          log.ip_address,
        ]),
        filename: `audit-logs_${new Date().toISOString().split("T")[0]}`,
      };

      await exportToExcel(exportData);
      toast.dismiss();
      toast.success(`${logs.length} ta yozuv Excel fayliga yuklandi`);
    } catch (error) {
      console.error("Export error:", error);
      toast.dismiss();
      toast.error("Excel fayliga yuklashda xatolik yuz berdi");
    } finally {
      setIsExporting(false);
    }
  };

  return (
    <div className="grid gap-6 2xl:grid-cols-[1fr_400px]">
      {/* Main Content */}
      <div className="space-y-6">
        <Card className="py-0 pt-6">
          <CardHeader className="px-2 md:px-4">
            <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
              <CardTitle className="text-lg md:text-xl">Audit Log ({totalCount} ta yozuv)</CardTitle>
            </div>
          </CardHeader>
          <CardContent className="px-2 md:px-4">
            {/* Search and Actions */}
            <div className="mb-6 flex flex-col gap-2 sm:flex-row">
              <div className="relative flex-1">
                <Search className="text-muted-foreground absolute top-4 left-2.5 h-4 w-4" />
                <Input
                  placeholder="Harakat yoki entity bo'yicha qidirish..."
                  value={searchValue}
                  onChange={(e) => setSearchValue(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && handleSearch()}
                  className="h-12 pl-8"
                />
              </div>
              <div className="flex gap-2">
                {/* Filter button for mobile/tablet */}
                <Button onClick={handleSearch} variant="outline" size="sm" className="h-12">
                  <Search className="mr-2 h-4 w-4" />
                  Qidirish
                </Button>
                <div className="2xl:hidden">
                  <AuditLogFilters isMobile />
                </div>
                <Button
                  onClick={handleExport}
                  variant="outline"
                  size="sm"
                  disabled={isExporting}
                  className="h-12 bg-blue-500 text-white hover:bg-blue-600"
                >
                  <FileDown className="mr-2 h-4 w-4" />
                  <span className="hidden sm:inline">Export</span>
                </Button>
              </div>
            </div>

            {/* Mobile View */}
            <div className="space-y-4 md:hidden">
              {logs.map((log) => (
                <Card key={log.id}>
                  <CardContent className="p-4">
                    <div className="space-y-2">
                      <div className="flex items-center justify-between">
                        {getActionBadge(log.action, log.entity_type)}
                        <span className="text-muted-foreground text-xs">{formatDate(log.created_at)}</span>
                      </div>
                      <div>
                        <p className="text-sm font-medium">
                          {log.user ? `${log.user.username} (${log.user.email})` : "Tizim"}
                        </p>
                        <p className="text-muted-foreground text-xs">
                          {getEntityTypeName(log.entity_type)}
                          {log.entity_id && ` #${log.entity_id}`}
                        </p>
                      </div>
                      {log.description && <p className="text-muted-foreground text-xs">{log.description}</p>}
                      {log.ip_address && (
                        <p className="text-muted-foreground text-xs">
                          <span className="font-medium">IP:</span> {log.ip_address}
                        </p>
                      )}
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>

            {/* Desktop View */}
            <div className="hidden md:block">
              <Table>
                <TableHeader>
                  <TableRow>
                    {/* <TableHead>Sana</TableHead> */}
                    <TableHead>Foydalanuvchi</TableHead>
                    <TableHead>Harakat</TableHead>
                    {/* <TableHead>Entity</TableHead> */}
                    <TableHead>Tafsilotlar</TableHead>
                    {/* <TableHead>IP Address</TableHead> */}
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {logs.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={6} className="text-center">
                        Ma&apos;lumot topilmadi
                      </TableCell>
                    </TableRow>
                  ) : (
                    logs.map((log) => (
                      <TableRow key={log.id}>
                        {/* <TableCell className="whitespace-nowrap">{formatDate(log.created_at)}</TableCell> */}
                        <TableCell className="w-28">
                          {log.user ? (
                            <div>
                              <p className="font-medium">
                                {log.user.first_name && log.user.last_name
                                  ? `${log.user.first_name} ${log.user.last_name}`
                                  : log.user.username}
                              </p>
                              <p className="text-muted-foreground text-xs">{formatDate(log.created_at)}</p>
                            </div>
                          ) : (
                            <div>
                              <p className="font-medium">Tizim</p>
                              <p className="text-muted-foreground text-xs">{formatDate(log.created_at)}</p>
                            </div>
                          )}
                        </TableCell>
                        <TableCell className="w-32 space-y-1">
                          {getActionBadge(log.action, log.entity_type)}
                          <div className="flex items-end gap-2 pl-2">
                            <p className="font-medium">{getEntityTypeName(log.entity_type)}</p>
                            {log.entity_id && <p className="text-muted-foreground text-xs">ID: {log.entity_id}</p>}
                          </div>
                        </TableCell>
                        <TableCell className="text-muted-foreground w-1/2 min-w-0 text-xs">
                          <p className="truncate whitespace-break-spaces">
                            {log.description && <p className="text-muted-foreground text-xs">{log.description}</p>}
                          </p>
                        </TableCell>
                        {/* <TableCell className="text-muted-foreground text-sm">{log.ip_address || "-"}</TableCell> */}
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </div>

            {/* Pagination */}
            {totalPages > 1 && (
              <div className="mt-6 mb-3 flex items-center justify-between">
                <div className="text-muted-foreground text-sm">
                  {currentPage} / {totalPages} sahifa
                </div>
                <div className="flex items-center gap-4">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => handlePageChange(currentPage - 1)}
                    className="h-12 px-6"
                    disabled={currentPage === 1}
                  >
                    <ChevronLeft className="h-4 w-4" />
                    Oldingi
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => handlePageChange(currentPage + 1)}
                    disabled={currentPage === totalPages}
                    className="h-12 px-6"
                  >
                    Keyingi
                    <ChevronRight className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Sidebar Filter - 2xl+ only */}
      <div className="hidden 2xl:block">
        <div className="sticky top-6">
          <AuditLogFilters />
        </div>
      </div>
    </div>
  );
}
