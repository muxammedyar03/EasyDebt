"use client";

import * as React from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useQueryClient } from "@tanstack/react-query";
import { ArrowLeft, Download, FileDown, Minus, Pencil, Plus, Trash2 } from "lucide-react";
import { toast } from "sonner";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { AddCompanyDialog, deleteCompany } from "@/features/create-company";
import { AddCompanyDebtDialog } from "@/features/create-company-debt";
import { AddCompanyPaymentDialog } from "@/features/make-company-payment";
import { useCompanyDetail, computeCompanySummary, COMPANY_QUERY_KEY } from "@/features/view-company";
import { formatCurrencyUzs, formatDateUz, formatUzPhone } from "@/lib/format";
import { getErrorMessage } from "@/lib/errors";
import { exportCompaniesListToExcel } from "@/lib/companies/export-companies-excel-client";
import { exportCompanyReceipt } from "@/lib/companies/export-company-pdf";
import { APP_CONFIG } from "@/config/app-config";
import type { CompanyDomain } from "@/types/domain/company.domain";
import { CompanyHistoryTables } from "./company-history-tables";
import { CompanyTimeline } from "./company-timeline";

type Props = {
  company: CompanyDomain;
};

export function CompanyDetailClient({ company: initialCompany }: Props) {
  const router = useRouter();
  const queryClient = useQueryClient();
  const { data: company, isLoading, refetch } = useCompanyDetail(initialCompany.id, true, initialCompany);

  const [debtOpen, setDebtOpen] = React.useState(false);
  const [payOpen, setPayOpen] = React.useState(false);
  const [editOpen, setEditOpen] = React.useState(false);

  const current = company ?? initialCompany;
  const summary = computeCompanySummary(current);

  const timeline = React.useMemo(() => {
    const debts = (current.debts ?? []).map((d) => ({
      id: `debt-${d.id}`,
      type: "DEBT" as const,
      amount: d.amount,
      note: d.note ?? null,
      createdAt: d.createdAt,
      subtitle: undefined as string | undefined,
    }));
    const payments = (current.payments ?? []).map((p) => ({
      id: `pay-${p.id}`,
      type: "PAYMENT" as const,
      amount: p.amount,
      note: p.note ?? null,
      createdAt: p.createdAt,
      subtitle: p.paymentType,
    }));
    return [...debts, ...payments].sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());
  }, [current.debts, current.payments]);

  const refresh = React.useCallback(async () => {
    await refetch();
    queryClient.invalidateQueries({ queryKey: [COMPANY_QUERY_KEY, current.id] });
    router.refresh();
  }, [refetch, queryClient, current.id, router]);

  const handlePdf = async () => {
    try {
      await exportCompanyReceipt({
        appName: APP_CONFIG.name,
        company: current,
        totals: summary,
        timeline: timeline.map((t) => ({
          type: t.type,
          amount: t.amount,
          createdAt: t.createdAt,
          note: t.note,
          subtitle: t.subtitle,
        })),
      });
      toast.success("PDF yuklandi");
    } catch (error) {
      toast.error(getErrorMessage(error, "PDF export xatosi"));
    }
  };

  const handleExcel = async () => {
    try {
      await exportCompaniesListToExcel({ search: current.name, status: "all" });
      toast.success("Excel yuklandi");
    } catch (error) {
      toast.error(getErrorMessage(error, "Excel export xatosi"));
    }
  };

  const handleDelete = async () => {
    if (!confirm(`"${current.name}" o'chirilsinmi?`)) return;
    try {
      await deleteCompany(current.id);
      toast.success("Kompaniya o'chirildi");
      router.push("/dashboard/my-debts");
      router.refresh();
    } catch (error) {
      toast.error(getErrorMessage(error, "O'chirishda xatolik"));
    }
  };

  if (isLoading && !company) {
    return <div className="text-muted-foreground p-4">Yuklanmoqda...</div>;
  }

  return (
    <div className="flex flex-col gap-6">
      <div className="flex w-full flex-col justify-between gap-4 md:flex-row md:items-center">
        <div className="flex items-center gap-3">
          <Button variant="ghost" size="icon" asChild>
            <Link href="/dashboard/my-debts">
              <ArrowLeft className="h-5 w-5" />
            </Link>
          </Button>
          <div>
            <div className="flex flex-wrap items-center gap-2">
              <h1 className="text-2xl font-bold">{current.name}</h1>
              {current.isOverdue && <Badge variant="destructive">Muddati o&apos;tgan</Badge>}
            </div>
            <p className="text-muted-foreground text-sm">
              {current.phoneNumber ? formatUzPhone(current.phoneNumber) : "Telefon yo'q"}
              {current.contactPerson ? ` · ${current.contactPerson}` : ""}
            </p>
          </div>
        </div>

        <div className="flex flex-wrap gap-2">
          <Button variant="outline" onClick={() => setEditOpen(true)}>
            <Pencil className="mr-2 h-4 w-4" />
            Tahrirlash
          </Button>
          <Button variant="outline" className="text-destructive" onClick={() => void handleDelete()}>
            <Trash2 className="mr-2 h-4 w-4" />
            O&apos;chirish
          </Button>
          <Button variant="outline" onClick={() => setDebtOpen(true)}>
            <Plus className="mr-2 h-4 w-4" />
            Qarz
          </Button>
          <Button variant="outline" onClick={() => setPayOpen(true)}>
            <Minus className="mr-2 h-4 w-4" />
            To&apos;lov
          </Button>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button>
                <Download className="mr-2 h-4 w-4" />
                Export
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem onSelect={() => void handlePdf()}>PDF</DropdownMenuItem>
              <DropdownMenuItem onSelect={() => void handleExcel()}>
                <FileDown className="mr-2 h-4 w-4" />
                Excel
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>

      <section className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <div className="rounded-lg border p-4">
          <p className="text-muted-foreground text-xs">Manzil</p>
          <p className="mt-1 text-sm font-medium">{current.address || "—"}</p>
          <p className="text-muted-foreground mt-2 text-xs">Qo&apos;shilgan: {formatDateUz(current.createdAt)}</p>
        </div>
        <div className="rounded-lg border p-4">
          <p className="text-muted-foreground text-xs">Umumiy qarz</p>
          <p className="mt-1 text-xl font-bold">{formatCurrencyUzs(summary.totalDebtAdded)}</p>
        </div>
        <div className="rounded-lg border p-4">
          <p className="text-muted-foreground text-xs">Umumiy to&apos;lov</p>
          <p className="mt-1 text-xl font-bold text-emerald-600">{formatCurrencyUzs(summary.totalPaid)}</p>
        </div>
        <div className="rounded-lg border p-4">
          <p className="text-muted-foreground text-xs">Qolgan qarz</p>
          <p className="mt-1 text-xl font-bold">{formatCurrencyUzs(summary.remaining)}</p>
        </div>
      </section>

      <Tabs defaultValue="debts" className="w-full">
        <TabsList className="grid h-10 w-full grid-cols-3 md:w-1/2">
          <TabsTrigger value="debts">
            Qarzlar
            <Badge variant="secondary" className="ml-1">
              {current.debts?.length ?? 0}
            </Badge>
          </TabsTrigger>
          <TabsTrigger value="payments">
            To&apos;lovlar
            <Badge variant="secondary" className="ml-1">
              {current.payments?.length ?? 0}
            </Badge>
          </TabsTrigger>
          <TabsTrigger value="timeline">Vaqt chizig&apos;i</TabsTrigger>
        </TabsList>
        <TabsContent value="debts" className="mt-4">
          <CompanyHistoryTables kind="debts" company={current} />
        </TabsContent>
        <TabsContent value="payments" className="mt-4">
          <CompanyHistoryTables kind="payments" company={current} />
        </TabsContent>
        <TabsContent value="timeline" className="mt-4">
          <CompanyTimeline timeline={timeline} />
        </TabsContent>
      </Tabs>

      <AddCompanyDialog
        open={editOpen}
        onOpenChange={setEditOpen}
        company={{
          id: current.id,
          name: current.name,
          contactPerson: current.contactPerson,
          phoneNumber: current.phoneNumber,
          address: current.address,
        }}
        onSuccess={() => void refresh()}
      />
      <AddCompanyDebtDialog
        open={debtOpen}
        onOpenChange={setDebtOpen}
        companyId={current.id}
        companyName={current.name}
        onSuccess={() => void refresh()}
      />
      <AddCompanyPaymentDialog
        open={payOpen}
        onOpenChange={setPayOpen}
        companyId={current.id}
        companyName={current.name}
        onSuccess={() => void refresh()}
      />
    </div>
  );
}
