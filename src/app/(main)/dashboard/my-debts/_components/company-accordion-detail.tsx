"use client";

import Link from "next/link";
import { FileDown, Eye, Loader2 } from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { formatCurrencyUzs, formatDateUz } from "@/lib/format";
import { useCompanyDetail, computeCompanySummary } from "@/features/view-company";
import { exportCompaniesListToExcel } from "@/lib/companies/export-companies-excel-client";
import { getErrorMessage } from "@/lib/errors";
import type { CompanyView } from "@/types/view/company.view";

type CompanyAccordionDetailProps = {
  company: CompanyView;
  open: boolean;
};

export function CompanyAccordionDetail({ company, open }: CompanyAccordionDetailProps) {
  const { data, isLoading, error } = useCompanyDetail(company.id, open);
  const summary = computeCompanySummary(data);

  const handleExcel = async () => {
    try {
      await exportCompaniesListToExcel({ search: company.name, status: "all" });
      toast.success("Excel yuklandi");
    } catch (e) {
      toast.error(getErrorMessage(e, "Export xatosi"));
    }
  };

  if (isLoading) {
    return (
      <div className="text-muted-foreground flex items-center gap-2 py-4 text-sm">
        <Loader2 className="h-4 w-4 animate-spin" />
        Yuklanmoqda...
      </div>
    );
  }

  if (error) {
    return <p className="text-destructive py-3 text-sm">{error.message}</p>;
  }

  return (
    <div className="space-y-4 py-2">
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <div>
          <p className="text-muted-foreground text-xs">Umumiy qarz</p>
          <p className="font-semibold">{formatCurrencyUzs(summary.totalDebtAdded)}</p>
        </div>
        <div>
          <p className="text-muted-foreground text-xs">To&apos;langan</p>
          <p className="font-semibold">{formatCurrencyUzs(summary.totalPaid)}</p>
        </div>
        <div>
          <p className="text-muted-foreground text-xs">Qolgan qarz</p>
          <p className="font-semibold">{formatCurrencyUzs(summary.remaining)}</p>
        </div>
        <div>
          <p className="text-muted-foreground text-xs">Oxirgi to&apos;lov</p>
          <p className="font-semibold">{data?.lastPaymentDate ? formatDateUz(data.lastPaymentDate) : "—"}</p>
        </div>
      </div>

      <div className="grid gap-1 text-sm sm:grid-cols-2">
        <p>
          <span className="text-muted-foreground">Mas&apos;ul: </span>
          {company.contactPerson || "—"}
        </p>
        <p>
          <span className="text-muted-foreground">Telefon: </span>
          {company.phoneDisplay || company.phoneNumber || "—"}
        </p>
        <p className="sm:col-span-2">
          <span className="text-muted-foreground">Manzil: </span>
          {company.address || "—"}
        </p>
      </div>

      <div className="flex flex-wrap gap-2">
        <Button variant="outline" size="sm" onClick={handleExcel}>
          <FileDown className="mr-2 h-4 w-4" />
          Excel
        </Button>
        <Button asChild size="sm">
          <Link href={`/dashboard/my-debts/${company.externalId}`}>
            <Eye className="mr-2 h-4 w-4" />
            Batafsil
          </Link>
        </Button>
        {company.isOverdue && <Badge variant="destructive">Muddati o&apos;tgan</Badge>}
      </div>
    </div>
  );
}
