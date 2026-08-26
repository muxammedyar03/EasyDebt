/**
 * DOMAIN LAYER - Payment Business Logic Types
 */

import type { DebtorDomain } from "./debtor.domain";

/**
 * Payment type enum (matches Prisma enum but defined here for independence)
 */
export enum PaymentTypeDomain {
  CASH = "CASH",
  CLICK = "CLICK",
  CARD = "CARD",
}

/**
 * Domain model for Payment
 */
export type PaymentDomain = {
  id: number;
  externalId: string;
  debtorId: number;
  amount: number; // Normalized from Decimal
  paymentType: PaymentTypeDomain;
  note: string | null;
  /** When true, this payment resets "O'rtacha kun" rating counter to 0 */
  resetsRating: boolean;
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
 * Input type for creating a new payment
 */
export type CreatePaymentDomainInput = {
  debtorId: number;
  amount: number;
  paymentType: PaymentTypeDomain;
  note?: string | null;
  createdBy: number;
};

/**
 * Input type for updating a payment
 */
export type UpdatePaymentDomainInput = {
  amount?: number;
  paymentType?: PaymentTypeDomain;
  note?: string | null;
};
