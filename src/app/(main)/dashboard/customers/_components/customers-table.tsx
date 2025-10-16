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

interface CustomersTableProps {
  customers: CustomerTableProps[];
  currentPage: number;
  totalPages: number;
  goodCount: number;
  averageCount: number;
  badCount: number;
}

export function CustomersTable({
  customers,
  currentPage,
  totalPages,
  goodCount,
  averageCount,
  badCount,
}: CustomersTableProps) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [searchValue, setSearchValue] = React.useState(searchParams.get("search") || "");

  const currentRating = searchParams.get("rating") || "all";

  const handleSearch = React.useCallback(
    (value: string) => {
      const params = new URLSearchParams(searchParams.toString());
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
    const params = new URLSearchParams(searchParams.toString());
    if (rating === "all") {
      params.delete("rating");
    } else {
      params.set("rating", rating);
    }
    params.set("page", "1");
    router.push(`/dashboard/customers?${params.toString()}`);
  };

  const handlePageChange = (page: number) => {
    const params = new URLSearchParams(searchParams.toString());
    params.set("page", page.toString());
    router.push(`/dashboard/customers?${params.toString()}`);
  };

  React.useEffect(() => {
    const timer = setTimeout(() => {
      if (searchValue !== searchParams.get("search")) {
        handleSearch(searchValue);
      }
    }, 500);

    return () => clearTimeout(timer);
  }, [searchValue, searchParams, handleSearch]);

  const getRatingBadge = (rating: "good" | "average" | "bad") => {
    switch (rating) {
      case "good":
        return (
          <Badge className="bg-green-500">
            <TrendingUp className="mr-1 h-3 w-3" />
            Yaxshi
          </Badge>
        );
      case "average":
        return (
          <Badge className="bg-yellow-500">
            <Minus className="mr-1 h-3 w-3" />
            O&apos;rtacha
          </Badge>
        );
      case "bad":
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
        <div className="relative flex-1">
          <Search className="text-muted-foreground absolute top-2.5 left-2.5 h-4 w-4" />
          <Input
            placeholder="Ism, familiya yoki telefon..."
            value={searchValue}
            onChange={(e) => setSearchValue(e.target.value)}
            className="pl-8"
          />
        </div>

        {/* Tabs */}
        <Tabs value={currentRating} onValueChange={handleRatingChange}>
          <TabsList className="grid w-full grid-cols-4">
            <TabsTrigger value="all">
              Barchasi
              <span className="ml-2 text-xs">({goodCount + averageCount + badCount})</span>
            </TabsTrigger>
            <TabsTrigger value="good">
              <TrendingUp className="mr-1 h-4 w-4" />
              Yaxshi
              <span className="ml-2 text-xs">({goodCount})</span>
            </TabsTrigger>
            <TabsTrigger value="average">
              <Minus className="mr-1 h-4 w-4" />
              O&apos;rtacha
              <span className="ml-2 text-xs">({averageCount})</span>
            </TabsTrigger>
            <TabsTrigger value="bad">
              <TrendingDown className="mr-1 h-4 w-4" />
              Yomon
              <span className="ml-2 text-xs">({badCount})</span>
            </TabsTrigger>
          </TabsList>
        </Tabs>
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
                      {customer.debtor.first_name} {customer.debtor.last_name}
                    </h3>
                    {getRatingBadge(customer.rating)}
                  </div>
                  {customer.debtor.phone_number && (
                    <p className="text-muted-foreground text-sm">{customer.debtor.phone_number}</p>
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
                    {customer.debtor.first_name} {customer.debtor.last_name}
                  </TableCell>
                  <TableCell>{customer.debtor.phone_number || "-"}</TableCell>
                  <TableCell>{getRatingBadge(customer.rating)}</TableCell>
                  <TableCell>{customer.avgDaysBetweenPayments.toFixed(0)} kun</TableCell>
                  <TableCell>{customer.payments.length}</TableCell>
                  <TableCell className={customer.debtor.total_debt > 0 ? "text-red-600" : "text-green-600"}>
                    {formatCurrency(customer.debtor.total_debt)}
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
      )}
    </div>
  );
}
