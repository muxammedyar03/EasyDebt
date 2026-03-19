/**
 * API response shapes for debtor export (GET /api/debtors/export).
 * Client-only consumption; keep aligned with app/api/debtors/export/route.ts.
 */

export type DebtorsExportApiRow = {
  id: number | string;
  first_name: string;
  last_name: string;
  phone_number: string;
  address: string;
  total_debt: number;
  total_debts: number;
  total_payments: number;
  status: string;
  created_at: string;
};

export type DebtorsExportApiResponse = {
  debtors: DebtorsExportApiRow[];
};
