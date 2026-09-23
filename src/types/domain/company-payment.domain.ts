/**
 * DOMAIN LAYER - CompanyPayment business types
 */

import type { PaymentTypeDomain } from "./payment.domain";
import type { CompanyDomain } from "./company.domain";

export type CompanyPaymentDomain = {
  id: number;
  externalId: string;
  companyId: number;
  amount: number;
  paymentType: PaymentTypeDomain;
  note: string | null;
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

export type CreateCompanyPaymentDomainInput = {
  idempotencyKey?: string;
  companyId: number;
  amount: number;
  paymentType: PaymentTypeDomain;
  note?: string | null;
  createdBy: number;
  receiptPath?: string | null;
  receiptName?: string | null;
  receiptMime?: string | null;
  receiptSize?: number | null;
};

export type UpdateCompanyPaymentDomainInput = {
  amount?: number;
  paymentType?: PaymentTypeDomain;
  note?: string | null;
  receiptPath?: string | null;
  receiptName?: string | null;
  receiptMime?: string | null;
  receiptSize?: number | null;
};
