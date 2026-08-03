"use client";

import * as React from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { ArrowDownUp, Download, Filter, RefreshCw, Search } from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { formatCurrencyUzs, formatDateUz } from "@/lib/format";
import { getErrorMessage } from "@/lib/errors";
import { exportToExcel, formatNumberForExcel } from "@/lib/excel-export";
import type { CompanyPeriodReportDomain } from "@/types/domain/company-daily-snapshot.domain";
import { getQuickRanges } from "@/lib/companies/period-ranges";
import { PeriodFilterDialog, type PeriodFilterValues } from "./period-filter-dialog";

type SortKey = "date" | "amount" | "name";

type Props = {
  initialReport: CompanyPeriodReportDomain;
  initialDateFrom: string;
  initialDateTo: string;
  initialSearch: string;
};

function serializeReport(report: CompanyPeriodReportDomain): CompanyPeriodReportDomain {
  return {
    ...report,
    dateFrom: new Date(report.dateFrom),
    dateTo: new Date(report.dateTo),
    debts: report.debts.map((d) => ({ ...d, createdAt: new Date(d.createdAt) })),
    payments: report.payments.map((p) => ({ ...p, createdAt: new Date(p.createdAt) })),
  };
}

export function CompanyDebtsReportClient({ initialReport, initialDateFrom, initialDateTo, initialSearch }: Props) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [report, setReport] = React.useState(() => serializeReport(initialReport));
  const [sortKey, setSortKey] = React.useState<SortKey>("date");
  const [sortAsc, setSortAsc] = React.useState(false);
  const [filterOpen, setFilterOpen] = React.useState(false);
  const [searchLocal, setSearchLocal] = React.useState(initialSearch);
  const [filterDraft, setFilterDraft] = React.useState<PeriodFilterValues>({
    dateFrom: initialDateFrom,
    dateTo: initialDateTo,
    search: initialSearch,
  });

  React.useEffect(() => {
    setReport(serializeReport(initialReport));
    setFilterDraft({
      dateFrom: initialDateFrom,
      dateTo: initialDateTo,
      search: initialSearch,
    });
    setSearchLocal(initialSearch);
  }, [initialReport, initialDateFrom, initialDateTo, initialSearch]);

  const pushFilters = (next: PeriodFilterValues) => {
    const params = new URLSearchParams(searchParams?.toString() ?? "");
    params.set("dateFrom", next.dateFrom);
    params.set("dateTo", next.dateTo);
    if (next.search.trim()) params.set("search", next.search.trim());
    else params.delete("search");
    router.push(`?${params.toString()}`);
  };

  const searchTerm = (searchParams?.get("search") || "").toLowerCase();

  const filteredDebts = React.useMemo(() => {
    let rows = report.debts;
    if (searchTerm) {
      rows = rows.filter(
        (d) => d.companyName.toLowerCase().includes(searchTerm) || d.note.toLowerCase().includes(searchTerm),
      );
    }
    return [...rows].sort((a, b) => {
      let cmp = 0;
      if (sortKey === "name") cmp = a.companyName.localeCompare(b.companyName);
      else if (sortKey === "amount") cmp = a.amount - b.amount;
      else cmp = a.createdAt.getTime() - b.createdAt.getTime();
      return sortAsc ? cmp : -cmp;
    });
  }, [report.debts, searchTerm, sortKey, sortAsc]);

  const filteredPayments = React.useMemo(() => {
    let rows = report.payments;
    if (searchTerm) {
      rows = rows.filter(
        (p) => p.companyName.toLowerCase().includes(searchTerm) || p.note.toLowerCase().includes(searchTerm),
      );
    }
    return [...rows].sort((a, b) => {
      let cmp = 0;
      if (sortKey === "name") cmp = a.companyName.localeCompare(b.companyName);
      else if (sortKey === "amount") cmp = a.amount - b.amount;
      else cmp = a.createdAt.getTime() - b.createdAt.getTime();
      return sortAsc ? cmp : -cmp;
    });
  }, [report.payments, searchTerm, sortKey, sortAsc]);

  const toggleSort = (key: SortKey) => {
    if (sortKey === key) setSortAsc((v) => !v);
    else {
      setSortKey(key);
      setSortAsc(true);
    }
  };

  const handleExport = async () => {
    try {
      await exportToExcel({
        headers: ["Tur", "Sana", "Kompaniya", "Summa", "Izoh", "Usul"],
        rows: [
          ...filteredDebts.map((d) => [
            "Qarz",
            formatDateUz(d.createdAt),
            d.companyName,
            formatNumberForExcel(d.amount),
            d.note,
            "-",
          ]),
          ...filteredPayments.map((p) => [
            "To'lov",
            formatDateUz(p.createdAt),
            p.companyName,
            formatNumberForExcel(p.amount),
            p.note,
            p.paymentType,
          ]),
        ],
        filename: `kompaniya_hisobot_${initialDateFrom}_${initialDateTo}`,
      });
      toast.success("Excel yuklandi");
    } catch (error) {
      toast.error(getErrorMessage(error, "Export xatosi"));
    }
  };

  const hasRows = filteredDebts.length > 0 || filteredPayments.length > 0;

  return (
    <div className="flex flex-col gap-5">
      {/* Header — productivity-style */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight uppercase sm:text-3xl">Qarz hisoboti</h1>
          <p className="text-muted-foreground mt-1 text-sm">
            Tanlangan davr bo&apos;yicha kompaniyalarga qarz va to&apos;lovlar tarixi
          </p>
        </div>
        <Button onClick={handleExport} className="shrink-0">
          <Download className="mr-2 h-4 w-4" />
          Export
        </Button>
      </div>

      {/* Summary indicators (not cards) */}
      <div className="text-muted-foreground flex flex-wrap items-center gap-x-6 gap-y-2 text-sm">
        <span className="inline-flex items-center gap-2">
          <span className="bg-primary/15 text-primary size-2 rounded-full" />
          Davr oxiri qarz:{" "}
          <strong className="text-foreground">
            {report.outstandingAtEnd != null ? formatCurrencyUzs(report.outstandingAtEnd) : "—"}
          </strong>
        </span>
        <span className="inline-flex items-center gap-2">
          <span className="bg-destructive/20 text-destructive size-2 rounded-full" />
          Qo&apos;shilgan qarz: <strong className="text-foreground">{formatCurrencyUzs(report.debtsSum)}</strong>
          <Badge variant="secondary">{report.debtsCount}</Badge>
        </span>
        <span className="inline-flex items-center gap-2">
          <span className="size-2 rounded-full bg-emerald-500/30" />
          To&apos;lovlar: <strong className="text-foreground">{formatCurrencyUzs(report.paymentsSum)}</strong>
          <Badge variant="secondary">{report.paymentsCount}</Badge>
        </span>
      </div>

      {/* Toolbar */}
      <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
        <div className="flex flex-wrap gap-2">
          {(
            [
              ["date", "Sana"],
              ["amount", "Summa"],
              ["name", "Nomi"],
            ] as const
          ).map(([key, label]) => (
            <Button
              key={key}
              type="button"
              variant={sortKey === key ? "default" : "outline"}
              size="sm"
              className="h-9"
              onClick={() => toggleSort(key)}
            >
              {label}
              <ArrowDownUp className="ml-1.5 h-3.5 w-3.5 opacity-70" />
            </Button>
          ))}
        </div>

        <div className="flex items-center gap-2">
          <div className="relative min-w-0 flex-1 sm:w-64">
            <Input
              value={searchLocal}
              onChange={(e) => setSearchLocal(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") {
                  pushFilters({ ...filterDraft, search: searchLocal });
                }
              }}
              placeholder="Qidirish..."
              className="h-10 pr-10"
            />
            <Button
              type="button"
              size="icon"
              className="absolute top-0 right-0 h-10 w-10 rounded-l-none"
              onClick={() => pushFilters({ ...filterDraft, search: searchLocal })}
            >
              <Search className="h-4 w-4" />
            </Button>
          </div>
          <Button type="button" variant="outline" size="icon" className="h-10 w-10" onClick={() => router.refresh()}>
            <RefreshCw className="h-4 w-4" />
          </Button>
          <Button type="button" variant="outline" size="icon" className="h-10 w-10" onClick={() => setFilterOpen(true)}>
            <Filter className="h-4 w-4" />
          </Button>
        </div>
      </div>

      <p className="text-muted-foreground text-xs">
        Davr: {formatDateUz(report.dateFrom)} — {formatDateUz(report.dateTo)}
        {report.outstandingAtStart != null && <> · Boshida: {formatCurrencyUzs(report.outstandingAtStart)}</>}
      </p>

      {/* Main data container */}
      <section className="bg-muted/30 min-h-[320px] rounded-xl border p-4 sm:p-5">
        {!hasRows ? (
          <div className="text-muted-foreground flex h-64 items-center justify-center text-sm">No records found</div>
        ) : (
          <div className="grid gap-6 lg:grid-cols-2">
            <div className="space-y-3">
              <h2 className="text-sm font-semibold tracking-wide uppercase">Kimlardan qarz olingan</h2>
              <ul className="divide-y rounded-lg border">
                {filteredDebts.map((d) => (
                  <li key={d.id} className="flex items-start justify-between gap-3 px-3 py-3 text-sm">
                    <div className="min-w-0">
                      <p className="truncate font-medium">{d.companyName}</p>
                      <p className="text-muted-foreground truncate text-xs">{d.note}</p>
                      <p className="text-muted-foreground text-xs">{formatDateUz(d.createdAt)}</p>
                    </div>
                    <span className="shrink-0 font-semibold tabular-nums">{formatCurrencyUzs(d.amount)}</span>
                  </li>
                ))}
                {filteredDebts.length === 0 && (
                  <li className="text-muted-foreground px-3 py-6 text-center text-sm">Qarz yozuvlari yo&apos;q</li>
                )}
              </ul>
            </div>

            <div className="space-y-3">
              <h2 className="text-sm font-semibold tracking-wide uppercase">Kimlarga to&apos;langan</h2>
              <ul className="divide-y rounded-lg border">
                {filteredPayments.map((p) => (
                  <li key={p.id} className="flex items-start justify-between gap-3 px-3 py-3 text-sm">
                    <div className="min-w-0">
                      <p className="truncate font-medium">{p.companyName}</p>
                      <p className="text-muted-foreground truncate text-xs">{p.note}</p>
                      <p className="text-muted-foreground text-xs">
                        {formatDateUz(p.createdAt)} · {p.paymentType}
                      </p>
                    </div>
                    <span className="shrink-0 font-semibold text-emerald-600 tabular-nums">
                      {formatCurrencyUzs(p.amount)}
                    </span>
                  </li>
                ))}
                {filteredPayments.length === 0 && (
                  <li className="text-muted-foreground px-3 py-6 text-center text-sm">
                    To&apos;lov yozuvlari yo&apos;q
                  </li>
                )}
              </ul>
            </div>
          </div>
        )}
      </section>

      <PeriodFilterDialog
        open={filterOpen}
        onOpenChange={setFilterOpen}
        values={filterDraft}
        onChange={setFilterDraft}
        onApply={() => {
          setFilterOpen(false);
          pushFilters(filterDraft);
        }}
        onReset={() => {
          const quick = getQuickRanges().thisMonth;
          const reset = { ...quick, search: "" };
          setFilterDraft(reset);
          setSearchLocal("");
          setFilterOpen(false);
          pushFilters(reset);
        }}
      />
    </div>
  );
}
