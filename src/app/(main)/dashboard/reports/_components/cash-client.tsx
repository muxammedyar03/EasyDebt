"use client";

import React, { useTransition } from "react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  ChevronLeft,
  ChevronRight,
  CreditCard,
  Wallet,
  Smartphone,
  Banknote,
  HandCoinsIcon,
  Loader2,
  Download,
} from "lucide-react";
import type { CashReport, CashReportRow } from "@/lib/services/reports.service";
import { REPORT_PAGE_SIZE, reportPeriod, type ReportRange } from "@/lib/report-query";
import { companyDay, COMPANY_TIME_ZONE } from "@/lib/company-report-date";
import { useRouter } from "next/navigation";
import { useLocale, useTranslations } from "next-intl";
import { formatCurrencyUzs } from "@/lib/format";
import { getPaymentTypeClass } from "@/lib/utils";

type Props = { report: CashReport; debtLimit: number };

export default function CashClient({ report, debtLimit }: Props) {
  const t = useTranslations("reports");
  const tDashboard = useTranslations("dashboard");
  const tPayment = useTranslations("payment");
  const common = useTranslations("common");
  const locale = useLocale();
  const dateLocale = locale === "ru" ? "ru-RU" : "uz-UZ";
  const today = companyDay().toISOString().slice(0, 10);
  const { date: selectedDate, range: timeRange, paymentsPage, debtsPage } = report.query;
  const [pending, startTransition] = useTransition();
  const router = useRouter();
  const filteredPayments = report.payments;
  const filteredDebts = report.debts;
  const totals = {
    cash: Number(report.totals.cash),
    card: Number(report.totals.card),
    click: Number(report.totals.click),
    totalPayments: Number(report.totals.total_payments),
    totalDebts: Number(report.totals.total_debts),
  };
  const params = new URLSearchParams({
    date: selectedDate,
    range: timeRange,
    paymentsPage: String(paymentsPage),
    debtsPage: String(debtsPage),
  });
  const navigate = (changes: Record<string, string>) => {
    const next = new URLSearchParams(params);
    Object.entries(changes).forEach(([key, value]) => next.set(key, value));
    startTransition(() => router.replace(`/dashboard/reports?${next}`, { scroll: false }));
  };
  const setTimeRange = (range: ReportRange) => navigate({ range, paymentsPage: "1", debtsPage: "1" });
  const setDate = (date: string) => navigate({ date, paymentsPage: "1", debtsPage: "1" });
  const navigateDate = (direction: number) => {
    const current = new Date(`${selectedDate}T00:00:00Z`);
    if (timeRange === "month") current.setUTCMonth(current.getUTCMonth() + direction, 1);
    else current.setUTCDate(current.getUTCDate() + direction * (timeRange === "week" ? 7 : 1));
    setDate(current.toISOString().slice(0, 10));
  };
  const period = reportPeriod(report.query);
  const labelDate = (date: string) => new Date(`${date}T00:00:00Z`).toLocaleDateString(dateLocale, { timeZone: "UTC" });
  const getDateRangeText = () =>
    period.from === period.to ? labelDate(period.from) : `${labelDate(period.from)} — ${labelDate(period.to)}`;
  const canGoNext = () => period.to < today;
  const pagination = (kind: "payments" | "debts", count: number, page: number) => {
    const total = Math.max(1, Math.ceil(count / REPORT_PAGE_SIZE));
    return (
      <nav
        aria-label={kind === "payments" ? t("paymentsList") : t("debtsList")}
        className="flex items-center justify-center gap-3 pt-4"
      >
        <Button
          variant="outline"
          disabled={pending || page <= 1}
          onClick={() => navigate({ [`${kind}Page`]: String(page - 1) })}
        >
          {common("previous")}
        </Button>
        <span>{common("pageOf", { current: page, total })}</span>
        <Button
          variant="outline"
          disabled={pending || page >= total}
          onClick={() => navigate({ [`${kind}Page`]: String(page + 1) })}
        >
          {common("next")}
        </Button>
      </nav>
    );
  };

  function debtLimitStatus(data: CashReportRow) {
    if (Number(data.debitor_total_debt) > debtLimit) {
      return {
        className: "bg-red-600/15 text-red-700 dark:text-red-500 hover:bg-red-600/15",
        label: tDashboard("statusOverLimit"),
      };
    } else if (Number(data.debitor_total_debt) <= 0) {
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

  const paymentTypeLabel = (type: CashReportRow["payment_type"]) => {
    if (type === "CASH") return tPayment("cash");
    if (type === "CARD") return tPayment("card");
    return tPayment("click");
  };

  return (
    <div className="w-full space-y-6" aria-busy={pending}>
      {pending && (
        <div role="status" className="flex items-center gap-2">
          <Loader2 className="size-4 animate-spin" />
          {common("loading")}
        </div>
      )}
      <fieldset disabled={pending} className="min-w-0 space-y-6">
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

            <div className="bg-card border-border flex flex-wrap items-center gap-2 rounded-xl border p-2">
              <Button variant="outline" size="icon" aria-label={common("previous")} onClick={() => navigateDate(-1)}>
                <ChevronLeft className="h-4 w-4" />
              </Button>

              <div className="flex-1 text-center font-medium">{getDateRangeText()}</div>
              <input
                type="date"
                aria-label={common("date")}
                value={selectedDate}
                max={today}
                onChange={(event) => {
                  if (event.target.value) setDate(event.target.value);
                }}
                className="bg-background rounded border p-2"
              />

              <Button
                variant="outline"
                size="icon"
                aria-label={common("next")}
                onClick={() => navigateDate(1)}
                disabled={pending || !canGoNext()}
              >
                <ChevronRight className="h-4 w-4" />
              </Button>
            </div>
          </div>
        </div>

        <Button asChild variant="outline">
          <a href={`/api/reports/export?${params}`}>
            <Download className="mr-2 size-4" />
            {t("exportCsv")}
          </a>
        </Button>

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
            <TabsTrigger value="payments">{t("paymentsTab", { count: report.totals.payments_count })}</TabsTrigger>
            <TabsTrigger value="debts">{t("debtsTab", { count: report.totals.debts_count })}</TabsTrigger>
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
                            {new Date(payment.created_at).toLocaleString(dateLocale, { timeZone: COMPANY_TIME_ZONE })}
                          </p>
                          {payment.note && (
                            <p className="text-muted-foreground text-sm italic">
                              {t("notePrefix", { note: payment.note })}
                            </p>
                          )}
                        </div>
                        <div className="space-y-2">
                          <p className="text-muted-foreground text-sm">{t("totalDebtLabel")}</p>
                          <p className="text-red-600">{formatCurrencyUzs(Number(payment.debitor_total_debt))}</p>
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
                          <Badge
                            variant="default"
                            className={`h-8 px-3 ${getPaymentTypeClass(payment.payment_type ?? "CASH")}`}
                          >
                            {paymentTypeLabel(payment.payment_type)}
                          </Badge>
                          <span className="w-full text-end font-bold text-green-600 lg:w-36">
                            {formatCurrencyUzs(Number(payment.amount))}
                          </span>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </div>
            </div>
            {pagination("payments", report.totals.payments_count, paymentsPage)}
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
                                {new Date(debt.created_at).toLocaleString(dateLocale, { timeZone: COMPANY_TIME_ZONE })}
                              </p>
                              {debt.note && <p className="text-muted-foreground text-sm italic">{debt.note}</p>}
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
                              <p className="text-red-600">{formatCurrencyUzs(Number(debt.debitor_total_debt))}</p>
                            </div>
                            <span className="flex font-bold text-red-600 lg:hidden lg:justify-end lg:text-end">
                              {formatCurrencyUzs(Number(debt.amount))}
                            </span>
                          </div>
                          <Badge
                            variant="default"
                            className={`hidden h-8 px-3 lg:flex ${debtLimitStatus(debt).className}`}
                          >
                            {debtLimitStatus(debt).label}
                          </Badge>
                          <span className="hidden font-bold text-red-600 lg:flex lg:justify-end lg:text-end">
                            {formatCurrencyUzs(Number(debt.amount))}
                          </span>
                        </div>
                      );
                    })
                  )}
                </div>
              </div>
            </div>
            {pagination("debts", report.totals.debts_count, debtsPage)}
          </TabsContent>
        </Tabs>
      </fieldset>
    </div>
  );
}
