"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { Search, TrendingUp, TrendingDown, Minus } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { CustomerTableProps } from "@/types/types";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useIsMobile } from "@/hooks/use-mobile";
import { SortToggleGroup } from "./sort-toggle-group";
import { useDebtorRatingStatus } from "@/hooks/useDebtorRatingStatus";
import { formatCurrencyUzs } from "@/lib/format";

interface CustomersTableDumbProps {
  customers: CustomerTableProps[];
  currentPage: number;
  totalPages: number;
  totalDebtorsCount: number;
  goodCount: number;
  averageCount: number;
  badCount: number;
  searchValue: string;
  onSearchChange: (value: string) => void;
  currentRating: string;
  onRatingChange: (rating: string) => void;
  currentSortField: string | null;
  currentSortOrder: "asc" | "desc" | null;
  onSortToggle: (field: string) => void;
  onPageChange: (page: number) => void;
}

export function CustomersTableDumb({
  customers,
  currentPage,
  totalPages,
  totalDebtorsCount,
  goodCount,
  averageCount,
  badCount,
  searchValue,
  onSearchChange,
  currentRating,
  onRatingChange,
  currentSortField,
  currentSortOrder,
  onSortToggle,
  onPageChange,
}: CustomersTableDumbProps) {
  const router = useRouter();
  const isMobile = useIsMobile();
  const { rating } = useDebtorRatingStatus();

  return (
    <div className="space-y-4">
      {/* Filters */}
      <div className="flex flex-col gap-4">
        {/* Search */}
        <div className="flex flex-col gap-4 md:flex-row">
          <div className="relative flex-1">
            <Search className="text-muted-foreground absolute top-4 left-2.5 h-4 w-4" />
            <Input
              placeholder="Ism, familiya yoki telefon..."
              value={searchValue}
              onChange={(e) => onSearchChange(e.target.value)}
              className="h-12 pl-8"
            />
          </div>
          <SortToggleGroup
            sortOptions={[
              { key: "date", label: "Sana" },
              { key: "days", label: "Kunlar" },
              { key: "payments", label: "To'lovlar" },
              { key: "debt", label: "Qarz" },
            ]}
            currentSortField={currentSortField}
            currentSortOrder={currentSortOrder}
            onToggle={onSortToggle}
            className="h-12 flex-1"
          />
        </div>

        {/* Tabs */}
        {!isMobile ? (
          <Tabs value={currentRating} onValueChange={onRatingChange} className="w-full lg:w-1/2">
            <TabsList className="grid h-12 w-full grid-cols-4">
              <TabsTrigger value="all">
                Barchasi
                <span className="ml-2 text-xs">({totalDebtorsCount})</span>
              </TabsTrigger>
              <TabsTrigger value="high">
                <TrendingUp className="mr-1 h-4 w-4" />
                Yaxshi
                <span className="ml-2 text-xs">({goodCount})</span>
              </TabsTrigger>
              <TabsTrigger value="medium">
                <Minus className="mr-1 h-4 w-4" />
                O&apos;rtacha
                <span className="ml-2 text-xs">({averageCount})</span>
              </TabsTrigger>
              <TabsTrigger value="critical">
                <TrendingDown className="mr-1 h-4 w-4" />
                Yomon
                <span className="ml-2 text-xs">({badCount})</span>
              </TabsTrigger>
            </TabsList>
          </Tabs>
        ) : (
          <Select value={currentRating} onValueChange={onRatingChange}>
            <SelectTrigger className="!h-12 w-32">
              <SelectValue placeholder="Select a rating" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Barchasi</SelectItem>
              <SelectItem value="high">Yaxshi</SelectItem>
              <SelectItem value="medium">O&apos;rtacha</SelectItem>
              <SelectItem value="critical">Yomon</SelectItem>
            </SelectContent>
          </Select>
        )}
      </div>

      {/* Mobile Card View */}
      <div className="grid gap-4 md:hidden">
        {customers.length === 0 ? (
          <div className="text-muted-foreground py-8 text-center">Ma&apos;lumot topilmadi</div>
        ) : (
          customers.map((customer) => (
            <Card
              key={customer.debtorId}
              className="cursor-pointer transition-all hover:shadow-md"
              onClick={() => router.push(`/dashboard/default/debitor/${customer.debtor.id}`)}
            >
              <CardContent className="p-4">
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <h3 className="font-semibold">
                      {customer.debtor.firstName} {customer.debtor.lastName}
                    </h3>
                    {rating(customer.rating)}
                  </div>
                  {customer.debtor.phoneNumber && (
                    <p className="text-muted-foreground text-sm">{customer.debtor.phoneNumber}</p>
                  )}
                  <div className="flex items-center justify-between pt-2">
                    <div>
                      <p className="text-muted-foreground text-xs">O&apos;rtacha kunlar</p>
                      <p className="text-lg font-bold">{customer.avgDaysBetweenPayments.toFixed(0)} kun</p>
                    </div>
                    <div className="text-right">
                      <p className="text-muted-foreground text-xs">To&apos;lovlar</p>
                      <p className="text-lg font-bold">{customer.payments.length}</p>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))
        )}
      </div>

      {/* Desktop Table View */}
      <div className="hidden rounded-md border md:block">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Mijoz</TableHead>
              <TableHead>Telefon</TableHead>
              <TableHead>Reyting</TableHead>
              <TableHead>O&apos;rtacha kunlar</TableHead>
              <TableHead>To&apos;lovlar soni</TableHead>
              <TableHead>Qarz</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {customers.length === 0 ? (
              <TableRow>
                <TableCell colSpan={6} className="text-center">
                  Ma&apos;lumot topilmadi
                </TableCell>
              </TableRow>
            ) : (
              customers.map((customer) => (
                <TableRow
                  key={customer.debtorId}
                  className="cursor-pointer"
                  onClick={() => router.push(`/dashboard/default/debitor/${customer.debtor.id}`)}
                >
                  <TableCell className="font-medium">
                    {customer.debtor.firstName} {customer.debtor.lastName}
                  </TableCell>
                  <TableCell>{customer.debtor.phoneNumber || "-"}</TableCell>
                  <TableCell>{rating(customer.rating)}</TableCell>
                  <TableCell>{customer.avgDaysBetweenPayments.toFixed(0)} kun</TableCell>
                  <TableCell>{customer.payments.length}</TableCell>
                  <TableCell className={customer.debtor.totalDebt > 0 ? "text-red-600" : "text-green-600"}>
                    {formatCurrencyUzs(customer.debtor.totalDebt)}
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex items-center justify-between">
          <div className="text-muted-foreground text-sm">
            {currentPage} / {totalPages} sahifa
          </div>
          <div className="flex items-center gap-2">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => onPageChange(currentPage - 1)}
              disabled={currentPage === 1}
            >
              Oldingi
            </Button>
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => onPageChange(currentPage + 1)}
              disabled={currentPage === totalPages}
            >
              Keyingi
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
