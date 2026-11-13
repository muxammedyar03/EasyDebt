"use client";

import * as React from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Search, TrendingUp, TrendingDown, Minus } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { CustomerTableProps } from "@/types/types";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useIsMobile } from "@/hooks/use-mobile";
import { SortToggleGroup } from "./sort-toggle-group";

interface CustomersTableProps {
  customers: CustomerTableProps[];
  currentPage: number;
  totalPages: number;
  totalDebtorsCount: number;
  goodCount: number;
  averageCount: number;
  badCount: number;
}

export function CustomersTable({
  customers,
  currentPage,
  totalPages,
  totalDebtorsCount,
  goodCount,
  averageCount,
  badCount,
}: CustomersTableProps) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [searchValue, setSearchValue] = React.useState(searchParams?.get("search") || "");
  const [isSearching, setIsSearching] = React.useState(false);
  const debounceRef = React.useRef<NodeJS.Timeout | null>(null);
  const isMobile = useIsMobile();
  const currentRating = searchParams?.get("rating") || "all";
  const currentSortField = searchParams?.get("sortField") || null;
  const currentSortOrder = (searchParams?.get("sortOrder") as "asc" | "desc" | null) || null;

  const handleSearch = React.useCallback(
    (value: string) => {
      const params = new URLSearchParams(searchParams?.toString() ?? "");
      if (value) {
        params.set("search", value);
      } else {
        params.delete("search");
      }
      params.set("page", "1");
      router.push(`/dashboard/customers?${params.toString()}`);
    },
    [router, searchParams],
  );

  const handleRatingChange = (rating: string) => {
    const params = new URLSearchParams(searchParams?.toString() ?? "");
    if (rating === "all") {
      params.delete("rating");
    } else {
      params.set("rating", rating);
    }
    params.set("page", "1");
    router.push(`/dashboard/customers?${params.toString()}`);
  };

  const handlePageChange = (page: number) => {
    const params = new URLSearchParams(searchParams?.toString() ?? "");
    params.set("page", page.toString());
    router.push(`/dashboard/customers?${params.toString()}`);
  };

  const handleSortToggle = (field: string) => {
    const params = new URLSearchParams(searchParams?.toString() ?? "");

    // 1) boshqa field bosilsa -> shu field ASC
    if (currentSortField !== field) {
      params.set("sortField", field);
      params.set("sortOrder", "asc");
      params.set("page", "1");
      router.push(`/dashboard/customers?${params.toString()}`);
      return;
    }

    // 2) shu field ASC bo'lsa -> DESC
    if (currentSortOrder === "asc") {
      params.set("sortOrder", "desc");
      params.set("page", "1");
      router.push(`/dashboard/customers?${params.toString()}`);
      return;
    }

    // 3) shu field DESC bo'lsa -> default (parametrlarni o'chirish)
    params.delete("sortField");
    params.delete("sortOrder");
    params.set("page", "1");
    router.push(`/dashboard/customers?${params.toString()}`);
  };

  // Debounce search on input change to avoid resetting pagination unexpectedly
  const onSearchChange = (value: string) => {
    setSearchValue(value);
    setIsSearching(true);
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => {
      handleSearch(value);
      setIsSearching(false);
    }, 300); // 300ms - tezroq
  };

  // URL o'zgarganda isSearching'ni reset qilish
  React.useEffect(() => {
    setIsSearching(false);
  }, [searchParams]);
  //  "high" | "medium" | "critical"
  const getRatingBadge = (rating: "high" | "medium" | "critical") => {
    switch (rating) {
      case "high":
        return (
          <Badge className="bg-green-500">
            <TrendingUp className="mr-1 h-3 w-3" />
            Yaxshi
          </Badge>
        );
      case "medium":
        return (
          <Badge className="bg-yellow-500">
            <Minus className="mr-1 h-3 w-3" />
            O&apos;rtacha
          </Badge>
        );
      case "critical":
        return (
          <Badge variant="destructive">
            <TrendingDown className="mr-1 h-3 w-3" />
            Yomon
          </Badge>
        );
    }
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat("uz-UZ").format(amount) + " so'm";
  };

  return (
    <div className="space-y-4">
      {/* Filters */}
      <div className="flex flex-col gap-4">
        {/* Search */}
        <div className="flex flex-col gap-4 md:flex-row">
          <div className="relative flex-1">
            <Search className="text-muted-foreground absolute top-1/2 left-2.5 h-4 w-4 -translate-y-1/2" />
            <Input
              placeholder="Ism, familiya yoki telefon..."
              value={searchValue}
              onChange={(e) => onSearchChange(e.target.value)}
              className="h-9 pr-10 pl-8"
            />
            {isSearching && (
              <div className="absolute top-1/2 right-3 -translate-y-1/2">
                <div className="border-primary h-5 w-5 animate-spin rounded-full border-2 border-t-transparent" />
              </div>
            )}
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
            onToggle={handleSortToggle}
            className="h-9 flex-1"
          />
        </div>

        {/* Tabs */}
        {!isMobile ? (
          //  "low" | "medium" | "high" | "critical"
          <Tabs value={currentRating} onValueChange={handleRatingChange} className="w-full lg:w-1/2">
            <TabsList className="grid h-9 w-full grid-cols-4">
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
          <Select value={currentRating} onValueChange={handleRatingChange}>
            <SelectTrigger className="!h-9 w-32">
              <SelectValue placeholder="Select a rating" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Barchasi</SelectItem>
              <SelectItem value="good">Yaxshi</SelectItem>
              <SelectItem value="average">O&apos;rtacha</SelectItem>
              <SelectItem value="bad">Yomon</SelectItem>
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
              onClick={() => router.push(`/dashboard/default/debitor/${customer.debtor.externalId}`)}
            >
              <CardContent className="p-4">
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <h3 className="font-semibold">
                      {customer.debtor.firstName} {customer.debtor.lastName}
                    </h3>
                    {getRatingBadge(customer.rating)}
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
                  onClick={() => router.push(`/dashboard/default/debitor/${customer.debtor.externalId}`)}
                >
                  <TableCell className="font-medium">
                    {customer.debtor.firstName} {customer.debtor.lastName}
                  </TableCell>
                  <TableCell>{customer.debtor.phoneNumber || "-"}</TableCell>
                  <TableCell>{getRatingBadge(customer.rating)}</TableCell>
                  <TableCell>{customer.avgDaysBetweenPayments.toFixed(0)} kun</TableCell>
                  <TableCell>{customer.payments.length}</TableCell>
                  <TableCell className={customer.debtor.totalDebt > 0 ? "text-red-600" : "text-green-600"}>
                    {formatCurrency(customer.debtor.totalDebt)}
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
              onClick={() => handlePageChange(currentPage - 1)}
              disabled={currentPage === 1}
            >
              Oldingi
            </Button>
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => handlePageChange(currentPage + 1)}
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
