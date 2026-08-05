"use client";

import * as React from "react";

import { AddCompanyDialog } from "@/features/create-company";
import type { CompanyView } from "@/types/view/company.view";
import { CompaniesToolbar } from "./companies-toolbar";
import { CompaniesAccordionList } from "./companies-accordion-list";
import { CompaniesPagination } from "./companies-pagination";
import { CompanyDebtsOverviewChart } from "./company-debts-overview-chart";
import { useCompaniesUrl } from "./hooks/use-companies-url";

type CompaniesClientProps = {
  companies: CompanyView[];
  currentPage: number;
  totalPages: number;
};

export function CompaniesClient({ companies, currentPage, totalPages }: CompaniesClientProps) {
  const { searchParams, searchValue, setSearchValue, isSearching, setParam, handlePageChange } = useCompaniesUrl();
  const [addOpen, setAddOpen] = React.useState(false);

  const status = searchParams?.get("status") || "all";
  const sortBy = searchParams?.get("sortBy") || "name";
  const dateFrom = searchParams?.get("dateFrom") || "";
  const dateTo = searchParams?.get("dateTo") || "";
  const minAmount = searchParams?.get("minAmount") || "";
  const maxAmount = searchParams?.get("maxAmount") || "";

  return (
    <div className="bg-muted/20 flex flex-col gap-4 rounded-xl border p-2">
      <CompaniesToolbar
        searchValue={searchValue}
        onSearchChange={setSearchValue}
        isSearching={isSearching}
        status={status}
        sortBy={sortBy}
        dateFrom={dateFrom}
        dateTo={dateTo}
        minAmount={minAmount}
        maxAmount={maxAmount}
        onStatusChange={(v) => setParam("status", v)}
        onSortChange={(v) => setParam("sortBy", v, false)}
        onDateFromChange={(v) => setParam("dateFrom", v || null)}
        onDateToChange={(v) => setParam("dateTo", v || null)}
        onMinAmountChange={(v) => setParam("minAmount", v || null)}
        onMaxAmountChange={(v) => setParam("maxAmount", v || null)}
        onAddCompany={() => setAddOpen(true)}
      />

      <CompaniesAccordionList companies={companies} />
      <CompanyDebtsOverviewChart />
      <CompaniesPagination currentPage={currentPage} totalPages={totalPages} onPageChange={handlePageChange} />

      <AddCompanyDialog open={addOpen} onOpenChange={setAddOpen} />
    </div>
  );
}
