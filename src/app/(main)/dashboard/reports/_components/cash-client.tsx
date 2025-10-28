"use client";

import React, { useState, useMemo } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ChevronLeft, ChevronRight, CreditCard, Wallet, Smartphone } from "lucide-react";
import { PaymentType } from "@prisma/client";
import { useRouter } from "next/navigation";

type PaymentData = {
  id: number;
  debtor_id: number;
  debtor_name: string;
  debitor_total_debt: number;
  debitor_is_overdue: boolean;
  amount: number;
  payment_type: PaymentType;
  note: string | null;
  created_at: string;
  created_by: number;
};

type DebtData = {
  id: number;
  debtor_id: number;
  debtor_name: string;
  debitor_total_debt: number;
  debitor_is_overdue: boolean;
  amount: number;
  description: string | null;
  created_at: string;
};

type Props = {
  payments: PaymentData[];
  debts: DebtData[];
};

export default function CashClient({ payments, debts }: Props) {
  const today = new Date().toISOString().split("T")[0];
  const [selectedDate, setSelectedDate] = useState(today);
  const [timeRange, setTimeRange] = useState<"daily" | "week" | "month">("daily");

  const getDateRange = () => {
    const selected = new Date(selectedDate);

    if (timeRange === "daily") {
      return [selectedDate];
    } else if (timeRange === "week") {
      const dates: string[] = [];
      for (let i = 6; i >= 0; i--) {
        const date = new Date(selected);
        date.setDate(date.getDate() - i);
        dates.push(date.toISOString().split("T")[0]);
      }
      return dates;
    } else {
      // month
      const dates: string[] = [];
      const startOfMonth = new Date(selected.getFullYear(), selected.getMonth(), 1);
      const endOfMonth = new Date(selected.getFullYear(), selected.getMonth() + 1, 0);

      for (let d = new Date(startOfMonth); d <= endOfMonth; d.setDate(d.getDate() + 1)) {
        dates.push(new Date(d).toISOString().split("T")[0]);
      }
      return dates;
    }
  };

  // Filter data by date range
  const filteredPayments = useMemo(() => {
    const dateRange = getDateRange();
    return payments.filter((p) => {
      const pDate = new Date(p.created_at).toISOString().split("T")[0];
      return dateRange.includes(pDate);
    });
  }, [selectedDate, timeRange, payments]);

  const filteredDebts = useMemo(() => {
    const dateRange = getDateRange();
    return debts.filter((d) => {
      const dDate = new Date(d.created_at).toISOString().split("T")[0];
      return dateRange.includes(dDate);
    });
  }, [selectedDate, timeRange, debts]);

  // Calculate totals
  const totals = useMemo(() => {
    let cash = 0,
      card = 0,
      click = 0;

    filteredPayments.forEach((p) => {
      if (p.payment_type === "CASH") cash += p.amount;
      else if (p.payment_type === "CARD") card += p.amount;
      else if (p.payment_type === "CLICK") click += p.amount;
    });

    const totalPayments = cash + card + click;
    const totalDebts = filteredDebts.reduce((sum, d) => sum + d.amount, 0);

    return { cash, card, click, totalPayments, totalDebts };
  }, [filteredPayments, filteredDebts]);

  // Date navigation
  const navigateDate = (direction: number) => {
    const current = new Date(selectedDate);

    if (timeRange === "daily") {
      current.setDate(current.getDate() + direction);
    } else if (timeRange === "week") {
      current.setDate(current.getDate() + direction * 7);
    } else {
      current.setMonth(current.getMonth() + direction);
    }

    setSelectedDate(current.toISOString().split("T")[0]);
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat("uz-UZ").format(amount) + " UZS";
  };

  const formatDate = (dateStr: string) => {
    return new Date(dateStr).toLocaleDateString("uz-UZ", {
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
    });
  };

  const getDebtorStatus = (totalDebt: number, isOverdue: boolean) => {
    if (totalDebt === 0) {
      return {
        className: "bg-green-100 text-green-800 hover:bg-green-100",
        text: "Qarzsiz",
      };
    } else if (isOverdue) {
      return {
        className: "bg-red-100 text-red-800 hover:bg-red-100",
        text: "Muddati o'tgan",
      };
    } else {
      return {
        className: "bg-yellow-100 text-yellow-800 hover:bg-yellow-100",
        text: "Qarzli",
      };
    }
  };

  const getDateRangeText = () => {
    if (timeRange === "daily") {
      return formatDate(selectedDate);
    } else if (timeRange === "week") {
      const dates = getDateRange();
      return `${formatDate(dates[0])} - ${formatDate(dates[dates.length - 1])}`;
    } else {
      const date = new Date(selectedDate);
      return date.toLocaleDateString("uz-UZ", { year: "numeric", month: "2-digit" });
    }
  };

  const canGoNext = () => {
    return selectedDate < today;
  };

  return (
    <div className="container mx-auto space-y-6">
      <div>
        <div className="flex gap-4">
          {/* Tab Selector */}
          <div className="bg-card flex gap-2 rounded-xl p-2">
            <Button
              variant={timeRange === "daily" ? "default" : "outline"}
              onClick={() => setTimeRange("daily")}
              className="flex-1"
            >
              Kunlik
            </Button>
            <Button
              variant={timeRange === "week" ? "default" : "outline"}
              onClick={() => setTimeRange("week")}
              className="flex-1"
            >
              Haftalik
            </Button>
            <Button
              variant={timeRange === "month" ? "default" : "outline"}
              onClick={() => setTimeRange("month")}
              className="flex-1"
            >
              Oylik
            </Button>
          </div>

          {/* Date Slider */}
          <div className="flex items-center gap-2">
            <Button variant="outline" size="icon" onClick={() => navigateDate(-1)}>
              <ChevronLeft className="h-4 w-4" />
            </Button>

            <div className="flex-1 text-center font-medium">{getDateRangeText()}</div>

            <Button variant="outline" size="icon" onClick={() => navigateDate(1)} disabled={!canGoNext()}>
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid gap-4 md:grid-cols-3">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Naqd</CardTitle>
            <Wallet className="text-muted-foreground h-4 w-4" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{formatCurrency(totals.cash)}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Karta</CardTitle>
            <CreditCard className="text-muted-foreground h-4 w-4" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{formatCurrency(totals.card)}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Click</CardTitle>
            <Smartphone className="text-muted-foreground h-4 w-4" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{formatCurrency(totals.click)}</div>
          </CardContent>
        </Card>
      </div>

      {/* Payments / Debts Tabs */}
      <Tabs defaultValue="payments" className="space-y-4">
        <TabsList className="grid w-full grid-cols-2 md:w-1/2 lg:w-1/3">
          <TabsTrigger value="payments">To&apos;lovlar ({filteredPayments.length})</TabsTrigger>
          <TabsTrigger value="debts">Qarzlar ({filteredDebts.length})</TabsTrigger>
        </TabsList>

        {/* Payments List */}
        <TabsContent value="payments" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>To&apos;lovlar ro&apos;yxati</CardTitle>
              <CardDescription>Jami: {formatCurrency(totals.totalPayments)}</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {filteredPayments.length === 0 ? (
                  <p className="text-muted-foreground py-8 text-center">To&apos;lovlar topilmadi</p>
                ) : (
                  filteredPayments.map((payment) => (
                    <div
                      key={payment.id}
                      className="hover:bg-accent flex flex-col items-center justify-between rounded-lg border p-4 transition-colors lg:grid lg:grid-cols-3"
                    >
                      <div className="space-y-1">
                        <p className="font-medium">{payment.debtor_name}</p>
                        <p className="text-muted-foreground text-sm">
                          {new Date(payment.created_at).toLocaleString("uz-UZ")}
                        </p>
                        {payment.note && <p className="text-muted-foreground text-sm italic">{payment.note}</p>}
                      </div>
                      <div className="space-y-2">
                        <p className="text-muted-foreground text-sm">Qarz:</p>
                        <p className="text-red-600">{formatCurrency(payment.debitor_total_debt)}</p>
                      </div>
                      <div className="flex items-center gap-3 lg:justify-end">
                        <Badge
                          variant={
                            payment.payment_type === "CASH"
                              ? "default"
                              : payment.payment_type === "CARD"
                                ? "secondary"
                                : "outline"
                          }
                        >
                          {payment.payment_type === "CASH"
                            ? "Naqd"
                            : payment.payment_type === "CARD"
                              ? "Karta"
                              : "Click"}
                        </Badge>
                        <span className="font-bold text-green-600">{formatCurrency(payment.amount)}</span>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Debts List */}
        <TabsContent value="debts" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Qarzlar ro&apos;yxati</CardTitle>
              <CardDescription>Jami: {formatCurrency(totals.totalDebts)}</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {filteredDebts.length === 0 ? (
                  <p className="text-muted-foreground py-8 text-center">Qarzlar topilmadi</p>
                ) : (
                  filteredDebts.map((debt) => {
                    const debtorStatus = getDebtorStatus(debt.debitor_total_debt, debt.debitor_is_overdue);
                    return (
                      <div
                        key={debt.id}
                        className="hover:bg-accent flex flex-col items-center justify-between rounded-lg border p-4 transition-colors lg:grid lg:grid-cols-4"
                      >
                        <div className="space-y-1">
                          <p className="font-medium">{debt.debtor_name}</p>
                          <p className="text-muted-foreground text-sm">
                            {new Date(debt.created_at).toLocaleString("uz-UZ")}
                          </p>
                          {debt.description && (
                            <p className="text-muted-foreground text-sm italic">{debt.description}</p>
                          )}
                        </div>
                        <div className="space-y-2">
                          <p className="text-muted-foreground text-sm">Qarz:</p>
                          <p className="text-red-600">{formatCurrency(debt.debitor_total_debt)}</p>
                        </div>
                        <Badge className={debtorStatus.className}>{debtorStatus.text}</Badge>
                        <span className="font-bold text-red-600 lg:justify-end lg:text-end">
                          {formatCurrency(debt.amount)}
                        </span>
                      </div>
                    );
                  })
                )}
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
