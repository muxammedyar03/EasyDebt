/**
 * API response shapes for company export (GET /api/companies/export).
 */

export type CompaniesExportApiRow = {
  id: number | string;
  name: string;
  contact_person: string;
  phone_number: string;
  address: string;
  total_debt: number;
  total_debts: number;
  total_payments: number;
  status: string;
  created_at: string;
};

export type CompaniesExportApiResponse = {
  companies: CompaniesExportApiRow[];
};
