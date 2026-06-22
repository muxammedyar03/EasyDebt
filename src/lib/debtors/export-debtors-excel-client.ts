import { exportToExcel, formatNumberForExcel } from "@/lib/excel-export";
import type { DebtorsExportApiResponse, DebtorsExportApiRow } from "@/types/api/debtors-export";
import { buildDebtorsExportQuery } from "@/lib/debtors/debtors-list-filters";

export async function fetchDebtorsExportJson(queryString: string): Promise<DebtorsExportApiResponse> {
  const response = await fetch(`/api/debtors/export?${queryString}`);
  if (!response.ok) {
    throw new Error("Export failed");
  }
  return response.json() as Promise<DebtorsExportApiResponse>;
}

function rowToExcelCells(debtor: DebtorsExportApiRow): (string | number)[] {
  return [
    debtor.id,
    debtor.first_name,
    debtor.last_name,
    debtor.phone_number || "-",
    debtor.address || "-",
    formatNumberForExcel(debtor.total_debt),
    formatNumberForExcel(debtor.total_payments ?? 0),
  ];
}

/**
 * GET /api/debtors/export dan olingan ma'lumotni Excel ga yozadi (toast yo'q).
 */
export async function exportDebtorsListToExcel(params: Record<string, string | string[] | undefined>): Promise<{
  rowCount: number;
}> {
  const queryString = buildDebtorsExportQuery(params);
  const data = await fetchDebtorsExportJson(queryString);
  const debtors = data.debtors;

  await exportToExcel({
    headers: ["ID", "Ism", "Familiya", "Telefon", "Manzil", "Jami qarz", "Jami to'lovlar"],
    rows: debtors.map(rowToExcelCells),
    filename: `qarzdorlar_${new Date().toISOString().split("T")[0]}`,
  });

  return { rowCount: debtors.length };
}
