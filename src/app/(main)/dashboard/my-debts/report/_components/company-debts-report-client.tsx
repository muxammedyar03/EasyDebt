"use client";

import * as React from "react";
import Link from "next/link";
import { useQuery, keepPreviousData } from "@tanstack/react-query";
import {
  ArrowDownUp,
  ChevronLeft,
  ChevronRight,
  CreditCard,
  Download,
  Filter,
  FileText,
  Loader2,
  RefreshCw,
  Search,
  Wallet,
  Smartphone,
  HandCoinsIcon,
  Banknote,
} from "lucide-react";
import { toast } from "sonner";
import { useTranslations } from "next-intl";

import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { formatCurrencyUzs, formatDateUz } from "@/lib/format";
import { getErrorMessage } from "@/lib/errors";
import { exportToExcel, formatNumberForExcel } from "@/lib/excel-export";
import { getPaymentTypeClass } from "@/lib/utils";
import { companyDebtReceiptUrl, getReceiptDisplayName } from "@/lib/companies/receipt-display";
import {
  type PeriodTimeRange,
  getPeriodBounds,
  navigatePeriodDate,
  canNavigatePeriodForward,
  todayInputDate,
} from "@/lib/period-date-range";
import { SearchFilterDialog } from "./search-filter-dialog";

type SortKey = "date" | "amount" | "name";

type DebtRow = {
  id: number;
  companyId: number;
  companyName: string;
  companyExternalId?: string;
  amount: number;
  note: string | null;
  receiptPath?: string | null;
  receiptName?: string | null;
  receiptMime?: string | null;
  createdAt: string;
};

type PaymentRow = {
  id: number;
  companyId: number;
  companyName: string;
  companyExternalId?: string;
  amount: number;
  note: string | null;
  paymentType: string;
  createdAt: string;
};

type ReportResponse = {
  dateFrom: string;
  dateTo: string;
  outstandingAtStart: number | null;
  outstandingAtEnd: number | null;
  debtsSum: number;
  debtsCount: number;
  paymentsSum: number;
  paymentsCount: number;
  cash: number;
  card: number;
  click: number;
  debts: DebtRow[];
  payments: PaymentRow[];
  paymentsPage: number;
  paymentsLimit: number;
  paymentsTotal: number;
  paymentsTotalPages: number;
  debtsPage: number;
  debtsLimit: number;
  debtsTotal: number;
  debtsTotalPages: number;
};

type FetchParams = {
  dateFrom: string;
  dateTo: string;
  paymentsPage: number;
  debtsPage: number;
  search: string;
  sort: SortKey;
  sortAsc: boolean;
};

async function fetchReport(params: FetchParams, fallbackError: string): Promise<ReportResponse> {
  const qs = new URLSearchParams({
    dateFrom: params.dateFrom,
    dateTo: params.dateTo,
    paymentsPage: String(params.paymentsPage),
    debtsPage: String(params.debtsPage),
    limit: "20",
    sort: params.sort,
    sortAsc: String(params.sortAsc),
  });
  if (params.search.trim()) qs.set("search", params.search.trim());

  const res = await fetch(`/api/company-reports/period?${qs}`);
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error((err as { error?: string }).error || fallbackError);
  }
  return res.json();
}

function paymentTypeLabel(type: string, labels: { cash: string; card: string; click: string }) {
  if (type === "CASH") return labels.cash;
  if (type === "CARD") return labels.card;
  if (type === "CLICK") return labels.click;
  return type;
}

function periodLabel(selectedDate: string, timeRange: PeriodTimeRange): string {
  const { dateFrom, dateTo } = getPeriodBounds(selectedDate, timeRange);
  if (timeRange === "daily") return formatDateUz(dateFrom);
  return `${formatDateUz(dateFrom)} — ${formatDateUz(dateTo)}`;
}

function PaginationBar({
  page,
  totalPages,
  onPrev,
  onNext,
}: {
  page: number;
  totalPages: number;
  onPrev: () => void;
  onNext: () => void;
}) {
  const t = useTranslations("companyTransactions");
  if (totalPages <= 1) return null;
  return (
    <div className="mt-4 flex items-center justify-between gap-3">
      <Button variant="outline" className="h-11 px-5" disabled={page === 1} onClick={onPrev}>
        {t("previous")}
      </Button>
      <span className="text-muted-foreground text-sm font-medium">
        {page} / {totalPages}
      </span>
      <Button variant="outline" className="h-11 px-5" disabled={page === totalPages} onClick={onNext}>
        {t("next")}
      </Button>
    </div>
  );
}

function CompanyLink({ name, externalId }: { name: string; externalId?: string }) {
  if (!externalId) return <p className="font-medium">{name}</p>;
  return (
    <Link href={`/dashboard/my-debts/${externalId}`} className="font-medium hover:underline">
      {name}
    </Link>
  );
}

export function CompanyDebtsReportClient() {
  const t = useTranslations("companyTransactions");
  const today = todayInputDate();
  const [selectedDate, setSelectedDate] = React.useState(today);
  const [timeRange, setTimeRange] = React.useState<PeriodTimeRange>("daily");
  const [paymentsPage, setPaymentsPage] = React.useState(1);
  const [debtsPage, setDebtsPage] = React.useState(1);
  const [sortKey, setSortKey] = React.useState<SortKey>("date");
  const [sortAsc, setSortAsc] = React.useState(false);
  const [searchApplied, setSearchApplied] = React.useState("");
  const [searchLocal, setSearchLocal] = React.useState("");
  const [filterOpen, setFilterOpen] = React.useState(false);
  const [filterDraft, setFilterDraft] = React.useState("");

  const { dateFrom, dateTo } = getPeriodBounds(selectedDate, timeRange);

  React.useEffect(() => {
    setPaymentsPage(1);
    setDebtsPage(1);
  }, [dateFrom, dateTo, searchApplied, sortKey, sortAsc]);

  const { data, isLoading, error, refetch, isFetching } = useQuery({
    queryKey: ["company-period-report", dateFrom, dateTo, paymentsPage, debtsPage, searchApplied, sortKey, sortAsc],
    queryFn: () =>
      fetchReport(
        {
          dateFrom,
          dateTo,
          paymentsPage,
          debtsPage,
          search: searchApplied,
          sort: sortKey,
          sortAsc,
        },
        t("reportLoadError"),
      ),
    placeholderData: keepPreviousData,
  });

  const toggleSort = (key: SortKey) => {
    if (sortKey === key) setSortAsc((v) => !v);
    else {
      setSortKey(key);
      setSortAsc(true);
    }
  };

  const applySearch = (value: string) => {
    setSearchApplied(value.trim());
    setSearchLocal(value.trim());
  };

  const handleExport = async () => {
    if (!data) return;
    try {
      await exportToExcel({
        headers: [t("type"), t("date"), t("company"), t("amount"), t("note"), t("method")],
        rows: [
          ...data.debts.map((d) => [
            t("debt"),
            formatDateUz(new Date(d.createdAt)),
            d.companyName,
            formatNumberForExcel(d.amount),
            d.note || "",
            "-",
          ]),
          ...data.payments.map((p) => [
            t("payment"),
            formatDateUz(new Date(p.createdAt)),
            p.companyName,
            formatNumberForExcel(p.amount),
            p.note || "",
            paymentTypeLabel(p.paymentType, {
              cash: t("cash"),
              card: t("card"),
              click: t("click"),
            }),
          ]),
        ],
        filename: `kompaniya_hisobot_${dateFrom}_${dateTo}`,
      });
      toast.success(t("exportSuccess"));
    } catch (err) {
      toast.error(getErrorMessage(err, t("exportError")));
    }
  };

  const navigateDate = (direction: number) => {
    setSelectedDate(navigatePeriodDate(selectedDate, timeRange, direction));
  };

  const debts = data?.debts ?? [];
  const payments = data?.payments ?? [];

  return (
    <div className="flex flex-col gap-5">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight uppercase sm:text-3xl">{t("reportTitle")}</h1>
          <p className="text-muted-foreground mt-1 text-sm">{t("reportSubtitle")}</p>
        </div>
        <Button onClick={() => void handleExport()} className="h-11 shrink-0 px-5" disabled={!data}>
          <Download className="mr-2 h-4 w-4" />
          {t("export")}
        </Button>
      </div>

      <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
        <div className="bg-card rounded-xl border p-5 shadow-sm">
          <div className="flex flex-row items-center justify-between pb-2">
            <h3 className="text-sm font-medium">{t("totalDebt")}</h3>
            <HandCoinsIcon className="h-5 w-5 text-red-500" />
          </div>
          <div className="text-lg font-bold text-red-600 md:text-2xl">{formatCurrencyUzs(data?.debtsSum ?? 0)}</div>
        </div>

        <div className="bg-card rounded-xl border p-5 shadow-sm">
          <div className="flex flex-row items-center justify-between pb-2">
            <h3 className="text-sm font-medium">{t("totalPayments")}</h3>
            <Banknote className="h-5 w-5 text-green-500" />
          </div>
          <div className="text-lg font-bold text-green-600 md:text-2xl">
            {formatCurrencyUzs(data?.paymentsSum ?? 0)}
          </div>
        </div>
        <div className="bg-card rounded-xl border p-5 shadow-sm">
          <div className="flex items-start justify-between gap-3">
            <div className="space-y-2">
              <p className="text-muted-foreground text-sm font-medium">{t("addedDebt")}</p>
              <div className="flex flex-wrap items-center gap-2">
                <p className="text-xl font-bold text-red-600 md:text-2xl">{formatCurrencyUzs(data?.debtsSum ?? 0)}</p>
                <Badge variant="secondary" className="h-7 min-w-7 px-2 text-sm">
                  {data?.debtsCount ?? 0}
                </Badge>
              </div>
            </div>
            <span className="bg-destructive/25 mt-1 size-2.5 shrink-0 rounded-full" />
          </div>
        </div>

        <div className="bg-card rounded-xl border p-5 shadow-sm">
          <div className="flex items-start justify-between gap-3">
            <div className="space-y-2">
              <p className="text-muted-foreground text-sm font-medium">{t("payments")}</p>
              <div className="flex flex-wrap items-center gap-2">
                <p className="text-xl font-bold text-emerald-600 md:text-2xl">
                  {formatCurrencyUzs(data?.paymentsSum ?? 0)}
                </p>
                <Badge variant="secondary" className="h-7 min-w-7 px-2 text-sm">
                  {data?.paymentsCount ?? 0}
                </Badge>
              </div>
            </div>
            <span className="mt-1 size-2.5 shrink-0 rounded-full bg-emerald-500/30" />
          </div>
        </div>
      </div>

      <div className="flex flex-col gap-4 lg:flex-row lg:items-center">
        <div className="bg-card border-border flex gap-2 rounded-xl border p-2">
          {(["daily", "week", "month"] as const).map((range) => (
            <Button
              key={range}
              variant={timeRange === range ? "default" : "outline"}
              onClick={() => setTimeRange(range)}
              className="h-11 flex-1 text-sm font-medium"
            >
              {range === "daily" ? t("daily") : range === "week" ? t("weekly") : t("monthly")}
            </Button>
          ))}
        </div>

        <div className="bg-card border-border flex items-center gap-2 rounded-xl border p-2">
          <Button variant="outline" size="icon" className="h-11 w-11" onClick={() => navigateDate(-1)}>
            <ChevronLeft className="h-5 w-5" />
          </Button>
          <div className="flex-1 text-center text-base font-medium">{periodLabel(selectedDate, timeRange)}</div>
          <Button
            variant="outline"
            size="icon"
            className="h-11 w-11"
            onClick={() => navigateDate(1)}
            disabled={!canNavigatePeriodForward(selectedDate, timeRange)}
          >
            <ChevronRight className="h-5 w-5" />
          </Button>
        </div>
      </div>

      <div className="grid gap-4 sm:grid-cols-3">
        <div className="bg-card rounded-xl border p-5">
          <div className="flex flex-row items-center justify-between pb-2">
            <h3 className="text-sm font-medium">{t("cash")}</h3>
            <Wallet className="text-muted-foreground h-5 w-5" />
          </div>
          <div className="text-xl font-bold md:text-2xl">{formatCurrencyUzs(data?.cash ?? 0)}</div>
        </div>
        <div className="bg-card rounded-xl border p-5">
          <div className="flex flex-row items-center justify-between pb-2">
            <h3 className="text-sm font-medium">{t("card")}</h3>
            <CreditCard className="text-muted-foreground h-5 w-5" />
          </div>
          <div className="text-xl font-bold md:text-2xl">{formatCurrencyUzs(data?.card ?? 0)}</div>
        </div>
        <div className="bg-card rounded-xl border p-5">
          <div className="flex flex-row items-center justify-between pb-2">
            <h3 className="text-sm font-medium">Click</h3>
            <Smartphone className="text-muted-foreground h-5 w-5" />
          </div>
          <div className="text-xl font-bold md:text-2xl">{formatCurrencyUzs(data?.click ?? 0)}</div>
        </div>
      </div>

      <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
        <div className="flex flex-wrap gap-2">
          {(
            [
              ["date", t("date")],
              ["amount", t("amount")],
              ["name", t("name")],
            ] as const
          ).map(([key, label]) => (
            <Button
              key={key}
              type="button"
              variant={sortKey === key ? "default" : "outline"}
              className="h-12 px-5 text-sm font-medium"
              onClick={() => toggleSort(key)}
            >
              {label}
              <ArrowDownUp className="ml-2 h-4 w-4 opacity-70" />
            </Button>
          ))}
        </div>

        <div className="flex items-center gap-2">
          <div className="relative min-w-0 flex-1 sm:w-72">
            <Input
              value={searchLocal}
              onChange={(e) => setSearchLocal(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") applySearch(searchLocal);
              }}
              placeholder={t("searchPlaceholder")}
              className="h-12 pr-12 text-base"
            />
            <Button
              type="button"
              size="icon"
              className="absolute top-0 right-0 h-12 w-12 rounded-l-none"
              onClick={() => applySearch(searchLocal)}
            >
              <Search className="h-5 w-5" />
            </Button>
          </div>
          <Button
            type="button"
            variant="outline"
            size="icon"
            className="h-12 w-12"
            onClick={() => void refetch()}
            disabled={isFetching}
          >
            {isFetching ? <Loader2 className="h-5 w-5 animate-spin" /> : <RefreshCw className="h-5 w-5" />}
          </Button>
          <Button
            type="button"
            variant="outline"
            size="icon"
            className="h-12 w-12"
            onClick={() => {
              setFilterDraft(searchLocal);
              setFilterOpen(true);
            }}
          >
            <Filter className="h-5 w-5" />
          </Button>
        </div>
      </div>

      <p className="text-muted-foreground text-sm">
        {t("period")}: {formatDateUz(dateFrom)} — {formatDateUz(dateTo)}
      </p>

      <Tabs defaultValue="payments" className="space-y-4">
        <TabsList className="grid h-12 w-full grid-cols-2 md:w-1/2 lg:w-1/3">
          <TabsTrigger value="payments" className="text-sm font-medium">
            {t("paymentsTab", { count: data?.paymentsTotal ?? 0 })}
          </TabsTrigger>
          <TabsTrigger value="debts" className="text-sm font-medium">
            {t("debtsTab", { count: data?.debtsTotal ?? 0 })}
          </TabsTrigger>
        </TabsList>

        <TabsContent value="payments" className="space-y-3">
          <div>
            <h2 className="text-xl font-bold">{t("paymentsList")}</h2>
            <p className="text-muted-foreground text-base">
              {t("totalAmount", { amount: formatCurrencyUzs(data?.paymentsSum ?? 0) })}
            </p>
          </div>

          <section className="bg-muted/30 min-h-[320px] rounded-xl border p-4 sm:p-5">
            {isLoading && !data ? (
              <div className="text-muted-foreground flex h-64 items-center justify-center gap-2 text-sm">
                <Loader2 className="h-5 w-5 animate-spin" />
                {t("loading")}
              </div>
            ) : error ? (
              <div className="text-destructive flex h-64 items-center justify-center text-sm">{error.message}</div>
            ) : payments.length === 0 ? (
              <div className="text-muted-foreground flex h-64 items-center justify-center text-sm">
                {t("noPayments")}
              </div>
            ) : (
              <ul className="bg-background divide-y rounded-lg border">
                {payments.map((p) => (
                  <li
                    key={p.id}
                    className="flex flex-col gap-2 px-4 py-4 sm:flex-row sm:items-center sm:justify-between"
                  >
                    <div className="min-w-0 space-y-1">
                      <CompanyLink name={p.companyName} externalId={p.companyExternalId} />
                      <p className="text-muted-foreground truncate text-xs">{p.note || "—"}</p>
                      <p className="text-muted-foreground text-xs">
                        {formatDateUz(new Date(p.createdAt), true)} ·
                        {paymentTypeLabel(p.paymentType, {
                          cash: t("cash"),
                          card: t("card"),
                          click: t("click"),
                        })}
                      </p>
                    </div>
                    <div className="flex items-center gap-3">
                      <Badge className={`h-8 px-3 ${getPaymentTypeClass(p.paymentType as "CASH" | "CLICK" | "CARD")}`}>
                        {paymentTypeLabel(p.paymentType, {
                          cash: t("cash"),
                          card: t("card"),
                          click: t("click"),
                        })}
                      </Badge>
                      <span className="font-bold text-emerald-600 tabular-nums">{formatCurrencyUzs(p.amount)}</span>
                    </div>
                  </li>
                ))}
              </ul>
            )}

            <PaginationBar
              page={data?.paymentsPage ?? 1}
              totalPages={data?.paymentsTotalPages ?? 1}
              onPrev={() => setPaymentsPage((p) => Math.max(1, p - 1))}
              onNext={() => setPaymentsPage((p) => p + 1)}
            />
          </section>
        </TabsContent>

        <TabsContent value="debts" className="space-y-3">
          <div>
            <h2 className="text-xl font-bold">{t("debtsList")}</h2>
            <p className="text-muted-foreground text-base">
              {t("totalAmount", { amount: formatCurrencyUzs(data?.debtsSum ?? 0) })}
            </p>
          </div>

          <section className="bg-muted/30 min-h-[320px] rounded-xl border p-4 sm:p-5">
            {isLoading && !data ? (
              <div className="text-muted-foreground flex h-64 items-center justify-center gap-2 text-sm">
                <Loader2 className="h-5 w-5 animate-spin" />
                {t("loading")}
              </div>
            ) : debts.length === 0 ? (
              <div className="text-muted-foreground flex h-64 items-center justify-center text-sm">{t("noDebts")}</div>
            ) : (
              <ul className="bg-background divide-y rounded-lg border">
                {debts.map((d) => (
                  <li key={d.id} className="flex items-start justify-between gap-3 px-4 py-4">
                    <div className="min-w-0 space-y-1">
                      <CompanyLink name={d.companyName} externalId={d.companyExternalId} />
                      <p className="text-muted-foreground truncate text-xs">{d.note || "—"}</p>
                      {d.receiptPath && (
                        <a
                          href={companyDebtReceiptUrl(d.id)}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-primary flex items-center gap-1 text-xs font-medium hover:underline"
                        >
                          <FileText className="size-3.5" />
                          <span className="max-w-56 truncate">
                            {getReceiptDisplayName({
                              receiptName: d.receiptName,
                              receiptPath: d.receiptPath,
                              receiptMime: d.receiptMime,
                            })}
                          </span>
                        </a>
                      )}
                      <p className="text-muted-foreground text-xs">{formatDateUz(new Date(d.createdAt))}</p>
                    </div>
                    <span className="shrink-0 font-semibold tabular-nums">{formatCurrencyUzs(d.amount)}</span>
                  </li>
                ))}
              </ul>
            )}

            <PaginationBar
              page={data?.debtsPage ?? 1}
              totalPages={data?.debtsTotalPages ?? 1}
              onPrev={() => setDebtsPage((p) => Math.max(1, p - 1))}
              onNext={() => setDebtsPage((p) => p + 1)}
            />
          </section>
        </TabsContent>
      </Tabs>

      <SearchFilterDialog
        open={filterOpen}
        onOpenChange={setFilterOpen}
        search={filterDraft}
        onSearchChange={setFilterDraft}
        onApply={() => {
          setFilterOpen(false);
          applySearch(filterDraft);
        }}
        onReset={() => {
          setFilterDraft("");
          setFilterOpen(false);
          applySearch("");
        }}
      />
    </div>
  );
}
