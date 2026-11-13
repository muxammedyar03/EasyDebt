"use client";

import Link from "next/link";
import { Building2, CalendarDays, Eye, FileDown, Loader2, MapPin, Phone, UserRound, Wallet } from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { formatCurrencyUzs, formatDateUz } from "@/lib/format";
import { useCompanyDetail, computeCompanySummary } from "@/features/view-company";
import { exportCompaniesListToExcel } from "@/lib/companies/export-companies-excel-client";
import { getErrorMessage } from "@/lib/errors";
import type { CompanyView } from "@/types/view/company.view";
import { useTranslations } from "next-intl";

type CompanyAccordionDetailProps = {
  company: CompanyView;
  open: boolean;
};

export function CompanyAccordionDetail({ company, open }: CompanyAccordionDetailProps) {
  const t = useTranslations("myDebts");
  const tCommon = useTranslations("common");
  const tExport = useTranslations("dataExport");
  const { data, isLoading, error } = useCompanyDetail(company.id, open);
  const summary = computeCompanySummary(data);

  const handleExcel = async () => {
    try {
      const { rowCount } = await exportCompaniesListToExcel({
        search: company.name,
        status: "all",
        headers: [
          tExport("companyHeaderId"),
          tExport("companyHeaderName"),
          tExport("companyHeaderContact"),
          tExport("companyHeaderPhone"),
          tExport("companyHeaderAddress"),
          tExport("companyHeaderTotalDebt"),
          tExport("companyHeaderTotalPayments"),
          tExport("companyHeaderStatus"),
        ],
      });
      toast.success(t("exportSuccess", { count: rowCount }));
    } catch (e) {
      toast.error(getErrorMessage(e, t("exportError")));
    }
  };

  if (isLoading) {
    return (
      <div className="text-muted-foreground flex items-center gap-2 py-6 text-sm">
        <Loader2 className="h-4 w-4 animate-spin" />
        {tCommon("loading")}
      </div>
    );
  }

  if (error) {
    return <p className="text-destructive py-3 text-sm">{error.message}</p>;
  }

  return (
    <div className="space-y-4 py-2">
      {/* Top-right actions */}
      <div className="flex flex-wrap items-center justify-end gap-2">
        <Button variant="outline" className="h-9" onClick={handleExcel}>
          <FileDown className="mr-2 h-4 w-4" />
          Excel
        </Button>
        <Button asChild variant="default" className="h-9">
          <Link href={`/dashboard/my-debts/${company.externalId}`}>
            <Eye className="mr-2 h-4 w-4" />
            Batafsil
          </Link>
        </Button>
      </div>

      {/* Header strip */}
      <div className="overflow-hidden rounded-xl border">
        <div className="bg-muted/50 flex flex-wrap items-center justify-between gap-2 px-4 py-3">
          <div className="flex items-center gap-2">
            <span className="bg-primary/15 text-primary flex size-7 items-center justify-center rounded-full">
              <Building2 className="size-3.5" />
            </span>
            <div>
              <p className="font-semibold">{company.name}</p>
              <p className="text-muted-foreground text-xs">ID: {company.id}</p>
            </div>
          </div>
          <Badge variant={company.statusBadge.variant}>{company.statusBadge.label}</Badge>
        </div>

        {/* Amounts recap row */}
        <div className="bg-border grid grid-cols-2 gap-px sm:grid-cols-4">
          <div className="bg-background px-4 py-4">
            <p className="text-muted-foreground text-[11px] tracking-wide uppercase">Umumiy qarz</p>
            <p className="mt-1 text-lg font-bold tabular-nums">{formatCurrencyUzs(summary.totalDebtAdded)}</p>
          </div>
          <div className="bg-background px-4 py-4">
            <p className="text-muted-foreground text-[11px] tracking-wide uppercase">To&apos;langan</p>
            <p className="mt-1 text-lg font-bold text-emerald-600 tabular-nums">
              {formatCurrencyUzs(summary.totalPaid)}
            </p>
          </div>
          <div className="bg-background px-4 py-4">
            <p className="text-muted-foreground text-[11px] tracking-wide uppercase">Qolgan</p>
            <p className="mt-1 text-lg font-bold tabular-nums">{formatCurrencyUzs(summary.remaining)}</p>
          </div>
          <div className="bg-background px-4 py-4">
            <p className="text-muted-foreground text-[11px] tracking-wide uppercase">Oxirgi to&apos;lov</p>
            <p className="mt-1 text-lg font-bold">{data?.lastPaymentDate ? formatDateUz(data.lastPaymentDate) : "—"}</p>
          </div>
        </div>
      </div>

      {/* Two info cards */}
      <div className="grid gap-3 md:grid-cols-2">
        <div className="rounded-xl border p-4">
          <div className="mb-3 flex items-center gap-2">
            <span className="bg-primary/15 text-primary flex size-6 items-center justify-center rounded-full">
              <UserRound className="size-3.5" />
            </span>
            <p className="text-xs font-semibold tracking-wide uppercase">{t("companyLabel")}</p>
          </div>
          <dl className="space-y-2 text-sm">
            <div className="flex justify-between gap-3">
              <dt className="text-muted-foreground flex items-center gap-1.5">
                <Phone className="size-3.5" /> {tExport("companyHeaderPhone")}
              </dt>
              <dd className="font-medium">{company.phoneDisplay || company.phoneNumber || "—"}</dd>
            </div>
            <div className="flex justify-between gap-3">
              <dt className="text-muted-foreground">{tExport("companyHeaderContact")}</dt>
              <dd className="font-medium">{company.contactPerson || "—"}</dd>
            </div>
            <div className="flex justify-between gap-3">
              <dt className="text-muted-foreground flex items-center gap-1.5">
                <MapPin className="size-3.5" /> {t("address")}
              </dt>
              <dd className="max-w-[60%] text-right font-medium">{company.address || "—"}</dd>
            </div>
          </dl>
        </div>

        <div className="rounded-xl border p-4">
          <div className="mb-3 flex items-center gap-2">
            <span className="bg-primary/15 text-primary flex size-6 items-center justify-center rounded-full">
              <Wallet className="size-3.5" />
            </span>
            <p className="text-xs font-semibold tracking-wide uppercase">Qo&apos;shimcha</p>
          </div>
          <dl className="space-y-2 text-sm">
            <div className="flex justify-between gap-3">
              <dt className="text-muted-foreground flex items-center gap-1.5">
                <CalendarDays className="size-3.5" /> Qo&apos;shilgan
              </dt>
              <dd className="font-medium">{formatDateUz(company.createdAt)}</dd>
            </div>
            <div className="flex justify-between gap-3">
              <dt className="text-muted-foreground">Oxirgi qarz</dt>
              <dd className="font-medium">{data?.lastDebtDate ? formatDateUz(data.lastDebtDate) : "—"}</dd>
            </div>
            <div className="flex justify-between gap-3">
              <dt className="text-muted-foreground">Status</dt>
              <dd>
                <Badge variant={company.statusBadge.variant}>{company.statusBadge.label}</Badge>
              </dd>
            </div>
          </dl>
        </div>
      </div>
    </div>
  );
}
