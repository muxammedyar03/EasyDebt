"use client";

import React, { useState, useMemo } from "react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ChevronLeft, ChevronRight, CreditCard, Wallet, Smartphone, Banknote, HandCoinsIcon } from "lucide-react";
import { PaymentType } from "@prisma/client";
import { useRouter } from "next/navigation";
import { formatCurrencyUzs, formatDate } from "@/lib/format";
import { getPaymentTypeClass } from "@/lib/utils";

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
  const router = useRouter();
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
  }, [selectedDate, timeRange, payments, getDateRange]);

  const filteredDebts = useMemo(() => {
    const dateRange = getDateRange();
    return debts.filter((d) => {
      const dDate = new Date(d.created_at).toISOString().split("T")[0];
      return dateRange.includes(dDate);
    });
  }, [selectedDate, timeRange, debts, getDateRange]);

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

  // const getDebtorStatus = (totalDebt: number, isOverdue: boolean) => {
  //   if (totalDebt === 0) {
  //     return {
  //       className: "bg-green-100 text-green-800 hover:bg-green-100",
  //       text: "To'langan",
  //     };
  //   } else if (isOverdue) {
  //     return {
  //       className: "bg-red-100 text-red-800 hover:bg-red-100",
  //       text: "Limitdan o'tgan",
  //     };
  //   } else {
  //     return {
  //       className: "bg-yellow-100 text-yellow-800 hover:bg-yellow-100",
  //       text: "Qarzdor",
  //     };
  //   }
  // };

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
    <div className="w-full space-y-6">
      {/* Summary cards */}
      <div className="grid grid-cols-2 gap-4 md:grid-cols-3">
        <div className="rounded-xl border p-4 shadow-sm">
          <div className="flex flex-row items-center justify-between space-y-0 pb-2">
            <h3 className="text-sm font-medium">Jami Qarz</h3>
            <HandCoinsIcon className="h-5 w-5 text-red-500" />
          </div>
          <div>
            <div className="text-lg font-bold text-red-600 md:text-2xl">{formatCurrencyUzs(totals.totalDebts)}</div>
          </div>
        </div>

        <div className="rounded-xl border p-4 shadow-sm">
          <div className="flex flex-row items-center justify-between space-y-0 pb-2">
            <h3 className="text-sm font-medium">Jami To&apos;lov</h3>
            <Banknote className="h-5 w-5 text-green-500" />
          </div>
          <div>
            <div className="text-lg font-bold text-green-600 md:text-2xl">
              {formatCurrencyUzs(totals.totalPayments)}
            </div>
          </div>
        </div>
      </div>

      <div>
        <div className="flex flex-col gap-4 md:flex-row md:items-center">
          {/* Tab Selector */}
          <div className="bg-card border-border flex gap-2 rounded-xl border p-2">
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
          <div className="bg-card border-border flex items-center gap-2 rounded-xl border p-2">
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
      <div className="grid gap-4 sm:grid-cols-3">
        {/* Summary Cards */}
        <div className="bg-card rounded-lg border p-4">
          <div className="flex flex-row items-center justify-between space-y-0 pb-2">
            <h3 className="text-sm font-medium">Naqd</h3>
            <Wallet className="text-muted-foreground h-4 w-4" />
          </div>
          <div>
            <div className="text-lg font-bold md:text-2xl">{formatCurrencyUzs(totals.cash)}</div>
          </div>
        </div>
        <div className="bg-card rounded-lg border p-4">
          <div className="flex flex-row items-center justify-between space-y-0 pb-2">
            <h3 className="text-sm font-medium">Karta</h3>
            <CreditCard className="text-muted-foreground h-4 w-4" />
          </div>
          <div>
            <div className="text-lg font-bold md:text-2xl">{formatCurrencyUzs(totals.card)}</div>
          </div>
        </div>

        <div className="bg-card rounded-lg border p-4">
          <div className="flex flex-row items-center justify-between space-y-0 pb-2">
            <h3 className="text-sm font-medium">Click</h3>
            <Smartphone className="text-muted-foreground h-4 w-4" />
          </div>
          <div>
            <div className="text-lg font-bold md:text-2xl">{formatCurrencyUzs(totals.click)}</div>
          </div>
        </div>
      </div>

      {/* Payments / Debts Tabs */}
      <Tabs defaultValue="payments" className="space-y-4">
        <TabsList className="grid h-10 w-full grid-cols-2 md:w-1/2 lg:w-1/3">
          <TabsTrigger value="payments">To&apos;lovlar ({filteredPayments.length})</TabsTrigger>
          <TabsTrigger value="debts">Qarzlar ({filteredDebts.length})</TabsTrigger>
        </TabsList>

        {/* Payments List */}
        <TabsContent value="payments" className="space-y-4">
          <div>
            <h1 className="text-2xl font-bold">To&apos;lovlar ro&apos;yxati</h1>
            <p className="text-muted-foreground pb-4 text-base">Jami: {formatCurrencyUzs(totals.totalPayments)}</p>
            <div>
              <div className="space-y-1">
                {filteredPayments.length === 0 ? (
                  <p className="text-muted-foreground py-8 text-center">To&apos;lovlar topilmadi</p>
                ) : (
                  filteredPayments.map((payment) => (
                    <div
                      key={payment.id}
                      onClick={() => router.push(`/dashboard/default/debitor/${payment.debtor_id}`)}
                      className="hover:bg-accent flex flex-col justify-between gap-y-4 rounded-lg border p-4 transition-colors lg:grid lg:grid-cols-3 lg:items-center lg:gap-y-0"
                    >
                      <div className="space-y-1">
                        <p className="font-medium">{payment.debtor_name}</p>
                        <p className="text-muted-foreground text-sm">
                          {new Date(payment.created_at).toLocaleString("uz-UZ")}
                        </p>
                        {payment.note && (
                          <p className="text-muted-foreground text-sm italic">{"Izoh: " + payment.note}</p>
                        )}
                      </div>
                      <div className="space-y-2">
                        <p className="text-muted-foreground text-sm">Umumiy qarz:</p>
                        <p className="text-red-600">{formatCurrencyUzs(payment.debitor_total_debt)}</p>
                      </div>
                      <div className="flex items-center gap-3 lg:justify-end">
                        <Badge variant="default" className={`h-8 px-3 ${getPaymentTypeClass(payment.payment_type)}`}>
                          {payment.payment_type === "CASH"
                            ? "Naqd"
                            : payment.payment_type === "CARD"
                              ? "Karta"
                              : "Click"}
                        </Badge>
                        <span className="font-bold text-green-600">{formatCurrencyUzs(payment.amount)}</span>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>
          </div>
        </TabsContent>

        {/* Debts List */}
        <TabsContent value="debts" className="space-y-4">
          <div>
            <h1 className="text-2xl font-bold">Qarzlar ro&apos;yxati</h1>
            <p className="text-muted-foreground pb-4 text-base">Jami: {formatCurrencyUzs(totals.totalDebts)}</p>
            <div>
              <div className="space-y-3">
                {filteredDebts.length === 0 ? (
                  <p className="text-muted-foreground py-8 text-center">Qarzlar topilmadi</p>
                ) : (
                  filteredDebts.map((debt) => {
                    return (
                      <div
                        key={debt.id}
                        onClick={() => router.push(`/dashboard/default/debitor/${debt.debtor_id}`)}
                        className="hover:bg-accent flex flex-col justify-between gap-y-4 rounded-lg border p-4 transition-colors lg:grid lg:grid-cols-4 lg:items-center lg:gap-y-0"
                      >
                        <div className="col-span-2 space-y-1">
                          <p className="font-medium">{debt.debtor_name}</p>
                          <p className="text-muted-foreground text-sm">
                            {new Date(debt.created_at).toLocaleString("uz-UZ")}
                          </p>
                          {debt.description && (
                            <p className="text-muted-foreground text-sm italic">{debt.description}</p>
                          )}
                        </div>
                        <div className="space-y-2">
                          <p className="text-muted-foreground text-sm">Umumiy qarz:</p>
                          <p className="text-red-600">{formatCurrencyUzs(debt.debitor_total_debt)}</p>
                        </div>
                        {/* <Badge className={debtorStatus.className}>{debtorStatus.text}</Badge> */}
                        <span className="font-bold text-red-600 lg:justify-end lg:text-end">
                          {formatCurrencyUzs(debt.amount)}
                        </span>
                      </div>
                    );
                  })
                )}
              </div>
            </div>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}
