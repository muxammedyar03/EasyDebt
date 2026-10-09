/**
 * DOMAIN LAYER - CompanyDebt business types
 */

import type { DebtItem } from "./debt.domain";
import type { CompanyDomain } from "./company.domain";

export type CompanyDebtDomain = {
  id: number;
  externalId: string;
  companyId: number;
  amount: number;
  note: string | null;
  items: DebtItem[] | null;
  receiptPath: string | null;
  receiptName: string | null;
  receiptMime: string | null;
  receiptSize: number | null;
  createdAt: Date;
  createdBy: number;
  company?: CompanyDomain;
  creator?: {
    id: number;
    username: string;
  };
};

export type CreateCompanyDebtDomainInput = {
  companyId: number;
  amount: number;
  note?: string | null;
  items?: DebtItem[] | null;
  receiptPath?: string | null;
  receiptName?: string | null;
  receiptMime?: string | null;
  receiptSize?: number | null;
  createdBy: number;
};

export type UpdateCompanyDebtDomainInput = {
  amount?: number;
  note?: string | null;
  items?: DebtItem[] | null;
};
