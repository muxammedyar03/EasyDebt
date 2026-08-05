"use client";

import * as React from "react";
import { ChevronDown, Eye, HandCoins, BadgePlus } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useQueryClient } from "@tanstack/react-query";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { AddCompanyDebtDialog } from "@/features/create-company-debt";
import { AddCompanyPaymentDialog } from "@/features/make-company-payment";
import { COMPANY_QUERY_KEY } from "@/features/view-company";
import { cn } from "@/lib/utils";
import type { CompanyView } from "@/types/view/company.view";
import { CompanyAccordionDetail } from "./company-accordion-detail";

type CompaniesAccordionListProps = {
  companies: CompanyView[];
};

export function CompaniesAccordionList({ companies }: CompaniesAccordionListProps) {
  const router = useRouter();
  const queryClient = useQueryClient();
  const [openId, setOpenId] = React.useState<number | null>(null);
  const [debtCompany, setDebtCompany] = React.useState<CompanyView | null>(null);
  const [payCompany, setPayCompany] = React.useState<CompanyView | null>(null);

  const refresh = (companyId?: number) => {
    router.refresh();
    if (companyId) {
      queryClient.invalidateQueries({ queryKey: [COMPANY_QUERY_KEY, companyId] });
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
      <div className="flex flex-col gap-3">
        {companies.map((company) => {
          const isOpen = openId === company.id;
          return (
            <div key={company.id} className="overflow-hidden rounded-xl border">
              <CompanyAccordionItem
                company={company}
                isOpen={isOpen}
                setDebtCompany={setDebtCompany}
                setPayCompany={setPayCompany}
                setOpenId={setOpenId}
              />
              {isOpen && (
                <div className="border-t px-4 pb-4">
                  <CompanyAccordionDetail company={company} open={isOpen} />
                </div>
              )}
            </div>
          );
        })}
      </div>

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

function CompanyAccordionItem({
  company,
  isOpen,
  setDebtCompany,
  setPayCompany,
  setOpenId,
}: {
  company: CompanyView;
  isOpen: boolean;
  setDebtCompany: (company: CompanyView) => void;
  setPayCompany: (company: CompanyView) => void;
  setOpenId: (id: number | null) => void;
}) {
  return (
    <div
      className={`grid gap-3 p-4 sm:grid-cols-2 sm:items-center md:grid-cols-12 ${isOpen ? "bg-gray-700 text-white" : "bg-white dark:bg-zinc-800"}`}
    >
      <div className="col-span-4 min-w-0">
        <p className={`truncate font-semibold ${isOpen ? "text-white" : ""}`}>{company.name}</p>
        <p className={`text-muted-foreground truncate text-sm ${isOpen ? "text-white" : ""}`}>
          {company.phoneDisplay || company.phoneNumber || "Telefon yo'q"}
        </p>
      </div>
      <Badge
        className={`col-span-2 ${company.statusBadge.label === "Qarzdor" ? "border-red-500/50 bg-red-600/10 py-1 text-red-700" : "border-green-500/50 bg-green-600/10 py-1 text-green-700"}`}
        variant={"default"}
      >
        {company.statusBadge.label}
      </Badge>
      <p className="col-span-2 text-center text-base font-bold tabular-nums">{company.totalDebtFormatted}</p>

      <div className="col-span-4 flex flex-wrap items-center gap-2 sm:justify-end">
        <Button
          size="sm"
          variant="outline"
          className={`${isOpen ? "text-black" : ""} h-10 border-red-600 bg-red-600/10 text-red-600 hover:bg-red-600/10 hover:text-red-600`}
          onClick={(e) => {
            e.stopPropagation();
            setDebtCompany(company);
          }}
        >
          <BadgePlus className="mr-1.5 h-4 w-4" />
          Qarz
        </Button>
        <Button
          size="sm"
          variant="outline"
          className={`${isOpen ? "text-black" : ""} h-10 border-green-600 bg-green-600/10 text-green-600 hover:bg-green-600/10 hover:text-green-600`}
          onClick={(e) => {
            e.stopPropagation();
            setPayCompany(company);
          }}
        >
          <HandCoins className="mr-1.5 h-4 w-4" />
          To&apos;lov
        </Button>
        <Button
          asChild
          size="icon"
          variant="outline"
          className={`${isOpen ? "hidden" : ""} h-10 w-10 border-blue-600 text-blue-600 hover:bg-blue-600/10 hover:text-blue-600`}
          onClick={(e) => e.stopPropagation()}
        >
          <Link href={`/dashboard/my-debts/${company.externalId}`} aria-label="Batafsil">
            <Eye className="h-4 w-4" />
          </Link>
        </Button>
        <Button
          size="icon"
          variant="ghost"
          className="shrink-0"
          onClick={() => setOpenId(isOpen ? null : company.id)}
          aria-expanded={isOpen}
          aria-label={isOpen ? "Yopish" : "Ochish"}
        >
          <ChevronDown className={cn("h-4 w-4 transition-transform", isOpen && "rotate-180")} />
        </Button>
      </div>
    </div>
  );
}
