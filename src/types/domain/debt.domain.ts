/**
 * DOMAIN LAYER - Debt Business Logic Types
 */

import type { DebtorDomain } from "./debtor.domain";

export type DebtItem = {
  name: string;
  price: number;
  quantity?: number;
};

/**
 * Domain model for Debt
 */
export type DebtDomain = {
  id: number;
  externalId: string;
  debtorId: number;
  amount: number; // Normalized from Decimal
  description: string | null;
  items: DebtItem[] | null;
  createdAt: Date;
  createdBy: number;

  // Relations (optional)
  debtor?: DebtorDomain;
  creator?: {
    id: number;
    username: string;
  };
};

/**
 * Input type for creating a new debt
 */
export type CreateDebtDomainInput = {
  debtorId: number;
  amount: number;
  description?: string | null;
  items?: DebtItem[] | null;
  createdBy: number;
};

/**
 * Input type for updating a debt
 */
export type UpdateDebtDomainInput = {
  amount?: number;
  description?: string | null;
  items?: DebtItem[] | null;
};
