"use client";

import * as React from "react";
import { MoreHorizontal, Pencil, Trash2, HandCoins, BadgePlus } from "lucide-react";
import { toast } from "sonner";
import { useRouter } from "next/navigation";
import { useQueryClient } from "@tanstack/react-query";

import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { AddCompanyDialog, deleteCompany } from "@/features/create-company";
import { AddCompanyDebtDialog } from "@/features/create-company-debt";
import { AddCompanyPaymentDialog } from "@/features/make-company-payment";
import { COMPANY_QUERY_KEY } from "@/features/view-company";
import { getErrorMessage } from "@/lib/errors";
import type { CompanyView } from "@/types/view/company.view";
import { CompanyAccordionDetail } from "./company-accordion-detail";

type CompaniesAccordionListProps = {
  companies: CompanyView[];
};

export function CompaniesAccordionList({ companies }: CompaniesAccordionListProps) {
  const router = useRouter();
  const queryClient = useQueryClient();
  const [openId, setOpenId] = React.useState<string>("");
  const [editCompany, setEditCompany] = React.useState<CompanyView | null>(null);
  const [debtCompany, setDebtCompany] = React.useState<CompanyView | null>(null);
  const [payCompany, setPayCompany] = React.useState<CompanyView | null>(null);

  const refresh = (companyId?: number) => {
    router.refresh();
    if (companyId) {
      queryClient.invalidateQueries({ queryKey: [COMPANY_QUERY_KEY, companyId] });
    }
  };

  const handleDelete = async (company: CompanyView) => {
    if (!confirm(`"${company.name}" o'chirilsinmi?`)) return;
    try {
      await deleteCompany(company.id);
      toast.success("Kompaniya o'chirildi");
      refresh();
    } catch (error) {
      toast.error(getErrorMessage(error, "O'chirishda xatolik"));
    }
  };

  if (companies.length === 0) {
    return (
      <div className="text-muted-foreground rounded-lg border border-dashed px-4 py-10 text-center text-sm">
        Kompaniyalar topilmadi. Yangi kompaniya qo&apos;shing.
      </div>
    );
  }

  return (
    <>
      <Accordion
        type="single"
        collapsible
        value={openId}
        onValueChange={setOpenId}
        className="rounded-lg border px-3 sm:px-4"
      >
        {companies.map((company) => {
          const itemValue = String(company.id);
          const isOpen = openId === itemValue;
          return (
            <AccordionItem key={company.id} value={itemValue} className="w-full">
              <div className="flex w-full items-center gap-1">
                <div className="min-w-0 flex-1">
                  <AccordionTrigger className="w-full hover:no-underline">
                    <div className="flex min-w-0 flex-1 flex-col items-start gap-1 pr-2 sm:flex-row sm:items-center sm:justify-between">
                      <div className="min-w-0 text-left">
                        <p className="truncate font-medium">{company.name}</p>
                        <p className="text-muted-foreground truncate text-xs">
                          {company.phoneDisplay || company.contactPerson || "—"}
                        </p>
                      </div>
                      <div className="flex shrink-0 items-center gap-2">
                        <Badge variant={company.statusBadge.variant}>{company.statusBadge.label}</Badge>
                        <span className="text-sm font-semibold tabular-nums">{company.totalDebtFormatted}</span>
                      </div>
                    </div>
                  </AccordionTrigger>
                </div>
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="ghost" size="icon" className="shrink-0" onClick={(e) => e.stopPropagation()}>
                      <MoreHorizontal className="h-4 w-4" />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end">
                    <DropdownMenuItem onClick={() => setDebtCompany(company)}>
                      <BadgePlus className="mr-2 h-4 w-4" />
                      Qarz qo&apos;shish
                    </DropdownMenuItem>
                    <DropdownMenuItem onClick={() => setPayCompany(company)}>
                      <HandCoins className="mr-2 h-4 w-4" />
                      To&apos;lov
                    </DropdownMenuItem>
                    <DropdownMenuItem onClick={() => setEditCompany(company)}>
                      <Pencil className="mr-2 h-4 w-4" />
                      Tahrirlash
                    </DropdownMenuItem>
                    <DropdownMenuItem className="text-destructive" onClick={() => handleDelete(company)}>
                      <Trash2 className="mr-2 h-4 w-4" />
                      O&apos;chirish
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              </div>
              <AccordionContent>
                <CompanyAccordionDetail company={company} open={isOpen} />
              </AccordionContent>
            </AccordionItem>
          );
        })}
      </Accordion>

      <AddCompanyDialog
        open={Boolean(editCompany)}
        onOpenChange={(open) => !open && setEditCompany(null)}
        company={
          editCompany
            ? {
                id: editCompany.id,
                name: editCompany.name,
                contactPerson: editCompany.contactPerson,
                phoneNumber: editCompany.phoneNumber,
                address: editCompany.address,
              }
            : null
        }
        onSuccess={() => refresh(editCompany?.id)}
      />

      {debtCompany && (
        <AddCompanyDebtDialog
          open={Boolean(debtCompany)}
          onOpenChange={(open) => !open && setDebtCompany(null)}
          companyId={debtCompany.id}
          companyName={debtCompany.name}
          onSuccess={() => refresh(debtCompany.id)}
        />
      )}

      {payCompany && (
        <AddCompanyPaymentDialog
          open={Boolean(payCompany)}
          onOpenChange={(open) => !open && setPayCompany(null)}
          companyId={payCompany.id}
          companyName={payCompany.name}
          onSuccess={() => refresh(payCompany.id)}
        />
      )}
    </>
  );
}
