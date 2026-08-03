import { exportToExcel, formatNumberForExcel } from "@/lib/excel-export";
import type { CompaniesExportApiResponse, CompaniesExportApiRow } from "@/types/api/companies-export";

export async function fetchCompaniesExportJson(search: string, status: string): Promise<CompaniesExportApiResponse> {
  const response = await fetch(
    `/api/companies/export?search=${encodeURIComponent(search)}&status=${encodeURIComponent(status)}`,
  );
  if (!response.ok) {
    throw new Error("Export failed");
  }
  return response.json() as Promise<CompaniesExportApiResponse>;
}

function rowToExcelCells(company: CompaniesExportApiRow): (string | number)[] {
  return [
    company.id,
    company.name,
    company.contact_person || "-",
    company.phone_number || "-",
    company.address || "-",
    formatNumberForExcel(company.total_debt),
    formatNumberForExcel(company.total_payments ?? 0),
    company.status,
  ];
}

export async function exportCompaniesListToExcel(params: { search: string; status: string }): Promise<{
  rowCount: number;
}> {
  const data = await fetchCompaniesExportJson(params.search, params.status);

  await exportToExcel({
    headers: ["ID", "Nomi", "Mas'ul", "Telefon", "Manzil", "Jami qarz", "Jami to'lovlar", "Status"],
    rows: data.companies.map(rowToExcelCells),
    filename: `kompaniyalar_${new Date().toISOString().split("T")[0]}_${params.status}`,
  });

  return { rowCount: data.companies.length };
}
