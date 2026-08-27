"use client";

import React, { useState, useMemo, useCallback } from "react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ChevronLeft, ChevronRight, CreditCard, Wallet, Smartphone, Banknote, HandCoinsIcon } from "lucide-react";
import { PaymentType } from "@prisma/client";
import { useRouter } from "next/navigation";
import { useLocale, useTranslations } from "next-intl";
import { formatCurrencyUzs, formatDateUz } from "@/lib/format";
import { getPaymentTypeClass } from "@/lib/utils";

type PaymentData = {
  id: number;
  debtor_id: number;
  debtor_external_id: string;
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
  debtor_external_id: string;
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
  debtLimit: number;
};

export default function CashClient({ payments, debts, debtLimit }: Props) {
  const t = useTranslations("reports");
  const tDashboard = useTranslations("dashboard");
  const tPayment = useTranslations("payment");
  const locale = useLocale();
  const dateLocale = locale === "ru" ? "ru-RU" : "uz-UZ";
  const today = new Date().toISOString().split("T")[0];
  const [selectedDate, setSelectedDate] = useState(today);
  const [timeRange, setTimeRange] = useState<"daily" | "week" | "month">("daily");
  const router = useRouter();
  const getDateRange = useCallback(() => {
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
      const dates: string[] = [];
      const startOfMonth = new Date(selected.getFullYear(), selected.getMonth(), 1);
      const endOfMonth = new Date(selected.getFullYear(), selected.getMonth() + 1, 0);

      for (let d = new Date(startOfMonth); d <= endOfMonth; d.setDate(d.getDate() + 1)) {
        dates.push(new Date(d).toISOString().split("T")[0]);
      }
      return dates;
    }
  }, [selectedDate, timeRange]);

  const filteredPayments = useMemo(() => {
    const dateRange = getDateRange();
    return payments.filter((p) => {
      const pDate = new Date(p.created_at).toISOString().split("T")[0];
      return dateRange.includes(pDate);
    });
  }, [payments, getDateRange]);

  const filteredDebts = useMemo(() => {
    const dateRange = getDateRange();
    return debts.filter((d) => {
      const dDate = new Date(d.created_at).toISOString().split("T")[0];
      return dateRange.includes(dDate);
    });
  }, [debts, getDateRange]);

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

  const getDateRangeText = () => {
    if (timeRange === "daily") {
      return formatDateUz(selectedDate);
    } else if (timeRange === "week") {
      const dates = getDateRange();
      return `${formatDateUz(dates[0])} - ${formatDateUz(dates[dates.length - 1])}`;
    } else {
      const date = new Date(selectedDate);
      return formatDateUz(date);
    }
  };

  const canGoNext = () => {
    return selectedDate < today;
  };

  function debtLimitStatus(data: PaymentData | DebtData) {
    if (data.amount > debtLimit) {
      return {
        className: "bg-red-600/15 text-red-700 dark:text-red-500 hover:bg-red-600/15",
        label: tDashboard("statusOverLimit"),
      };
    } else if (data.amount <= 0) {
      return {
        className: "bg-green-600/15 text-green-700 dark:text-green-500 hover:bg-green-600/15",
        label: tDashboard("statusPaid"),
      };
    } else {
      return {
        className: "bg-gray-500/20 dark:bg-gray-500/30 text-gray-900 dark:text-white hover:bg-gray-700/20",
        label: tDashboard("statusDebtor"),
      };
    }
  }

  const paymentTypeLabel = (type: PaymentType) => {
    if (type === "CASH") return tPayment("cash");
    if (type === "CARD") return tPayment("card");
    return tPayment("click");
  };

  return (
    <div className="w-full space-y-6">
      <div className="grid grid-cols-2 gap-4 md:grid-cols-3">
        <div className="rounded-xl border p-4 shadow-sm">
          <div className="flex flex-row items-center justify-between space-y-0 pb-2">
            <h3 className="text-sm font-medium">{t("cashTotalDebt")}</h3>
            <HandCoinsIcon className="h-5 w-5 text-red-500" />
          </div>
          <div>
            <div className="text-lg font-bold text-red-600 md:text-2xl">{formatCurrencyUzs(totals.totalDebts)}</div>
          </div>
        </div>

        <div className="rounded-xl border p-4 shadow-sm">
          <div className="flex flex-row items-center justify-between space-y-0 pb-2">
            <h3 className="text-sm font-medium">{t("cashTotalPayment")}</h3>
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
          <div className="bg-card border-border flex gap-2 rounded-xl border p-2">
            <Button
              variant={timeRange === "daily" ? "default" : "outline"}
              onClick={() => setTimeRange("daily")}
              className="flex-1"
            >
              {t("daily")}
            </Button>
            <Button
              variant={timeRange === "week" ? "default" : "outline"}
              onClick={() => setTimeRange("week")}
              className="flex-1"
            >
              {t("weekly")}
            </Button>
            <Button
              variant={timeRange === "month" ? "default" : "outline"}
              onClick={() => setTimeRange("month")}
              className="flex-1"
            >
              {t("monthly")}
            </Button>
          </div>

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

      <div className="grid gap-4 sm:grid-cols-3">
        <div className="bg-card rounded-lg border p-4">
          <div className="flex flex-row items-center justify-between space-y-0 pb-2">
            <h3 className="text-sm font-medium">{tPayment("cash")}</h3>
            <Wallet className="text-muted-foreground h-4 w-4" />
          </div>
          <div>
            <div className="text-lg font-bold md:text-2xl">{formatCurrencyUzs(totals.cash)}</div>
          </div>
        </div>
        <div className="bg-card rounded-lg border p-4">
          <div className="flex flex-row items-center justify-between space-y-0 pb-2">
            <h3 className="text-sm font-medium">{tPayment("card")}</h3>
            <CreditCard className="text-muted-foreground h-4 w-4" />
          </div>
          <div>
            <div className="text-lg font-bold md:text-2xl">{formatCurrencyUzs(totals.card)}</div>
          </div>
        </div>

        <div className="bg-card rounded-lg border p-4">
          <div className="flex flex-row items-center justify-between space-y-0 pb-2">
            <h3 className="text-sm font-medium">{tPayment("click")}</h3>
            <Smartphone className="text-muted-foreground h-4 w-4" />
          </div>
          <div>
            <div className="text-lg font-bold md:text-2xl">{formatCurrencyUzs(totals.click)}</div>
          </div>
        </div>
      </div>

      <Tabs defaultValue="payments" className="space-y-4">
        <TabsList className="grid h-10 w-full grid-cols-2 md:w-1/2 lg:w-1/3">
          <TabsTrigger value="payments">{t("paymentsTab", { count: filteredPayments.length })}</TabsTrigger>
          <TabsTrigger value="debts">{t("debtsTab", { count: filteredDebts.length })}</TabsTrigger>
        </TabsList>

        <TabsContent value="payments" className="space-y-4">
          <div>
            <h1 className="text-2xl font-bold">{t("paymentsList")}</h1>
            <p className="text-muted-foreground pb-4 text-base">
              {t("totalAmount", { amount: formatCurrencyUzs(totals.totalPayments) })}
            </p>
            <div>
              <div className="space-y-1">
                {filteredPayments.length === 0 ? (
                  <p className="text-muted-foreground py-8 text-center">{t("noPayments")}</p>
                ) : (
                  filteredPayments.map((payment) => (
                    <div
                      key={payment.id}
                      onClick={() => router.push(`/dashboard/default/debitor/${payment.debtor_external_id}`)}
                      className="hover:bg-accent flex flex-col justify-between gap-y-4 rounded-lg border p-4 transition-colors lg:grid lg:grid-cols-4 lg:items-center lg:gap-y-0"
                    >
                      <div className="space-y-1">
                        <p className="font-medium">{payment.debtor_name}</p>
                        <p className="text-muted-foreground text-sm">
                          {new Date(payment.created_at).toLocaleString(dateLocale)}
                        </p>
                        {payment.note && (
                          <p className="text-muted-foreground text-sm italic">
                            {t("notePrefix", { note: payment.note })}
                          </p>
                        )}
                      </div>
                      <div className="space-y-2">
                        <p className="text-muted-foreground text-sm">{t("totalDebtLabel")}</p>
                        <p className="text-red-600">{formatCurrencyUzs(payment.debitor_total_debt)}</p>
                      </div>
                      <Badge
                        variant="default"
                        className={`hidden h-8 px-3 lg:flex ${debtLimitStatus(payment).className}`}
                      >
                        {debtLimitStatus(payment).label}
                      </Badge>
                      <div className="flex items-center justify-end gap-3">
                        <Badge
                          variant="default"
                          className={`flex h-8 px-3 lg:hidden ${debtLimitStatus(payment).className}`}
                        >
                          {debtLimitStatus(payment).label}
                        </Badge>
                        <Badge variant="default" className={`h-8 px-3 ${getPaymentTypeClass(payment.payment_type)}`}>
                          {paymentTypeLabel(payment.payment_type)}
                        </Badge>
                        <span className="w-full text-end font-bold text-green-600 lg:w-36">
                          {formatCurrencyUzs(payment.amount)}
                        </span>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>
          </div>
        </TabsContent>

        <TabsContent value="debts" className="space-y-4">
          <div>
            <h1 className="text-2xl font-bold">{t("debtsList")}</h1>
            <p className="text-muted-foreground pb-4 text-base">
              {t("totalAmount", { amount: formatCurrencyUzs(totals.totalDebts) })}
            </p>
            <div>
              <div className="space-y-3">
                {filteredDebts.length === 0 ? (
                  <p className="text-muted-foreground py-8 text-center">{t("noDebts")}</p>
                ) : (
                  filteredDebts.map((debt) => {
                    return (
                      <div
                        key={debt.id}
                        onClick={() => router.push(`/dashboard/default/debitor/${debt.debtor_external_id}`)}
                        className="hover:bg-accent flex flex-col justify-between gap-y-4 rounded-lg border p-4 transition-colors lg:grid lg:grid-cols-5 lg:items-center lg:gap-y-0"
                      >
                        <div className="col-span-2 flex justify-between space-y-1">
                          <div className="space-y-1">
                            <p className="font-medium">{debt.debtor_name}</p>
                            <p className="text-muted-foreground text-sm">
                              {new Date(debt.created_at).toLocaleString(dateLocale)}
                            </p>
                            {debt.description && (
                              <p className="text-muted-foreground text-sm italic">{debt.description}</p>
                            )}
                          </div>
                          <Badge
                            variant="default"
                            className={`flex h-8 px-3 lg:hidden ${debtLimitStatus(debt).className}`}
                          >
                            {debtLimitStatus(debt).label}
                          </Badge>
                        </div>
                        <div className="flex items-center justify-between space-y-2">
                          <div>
                            <p className="text-muted-foreground text-sm">{t("totalDebtLabel")}</p>
                            <p className="text-red-600">{formatCurrencyUzs(debt.debitor_total_debt)}</p>
                          </div>
                          <span className="flex font-bold text-red-600 lg:hidden lg:justify-end lg:text-end">
                            {formatCurrencyUzs(debt.amount)}
                          </span>
                        </div>
                        <Badge
                          variant="default"
                          className={`hidden h-8 px-3 lg:flex ${debtLimitStatus(debt).className}`}
                        >
                          {debtLimitStatus(debt).label}
                        </Badge>
                        <span className="hidden font-bold text-red-600 lg:flex lg:justify-end lg:text-end">
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
