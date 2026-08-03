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
  note: string;
  receiptPath: string | null;
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
  companyId: number;
  amount: number;
  paymentType: PaymentTypeDomain;
  note: string;
  createdBy: number;
  receiptPath?: string | null;
  receiptMime?: string | null;
  receiptSize?: number | null;
};

export type UpdateCompanyPaymentDomainInput = {
  amount?: number;
  paymentType?: PaymentTypeDomain;
  note?: string;
  receiptPath?: string | null;
  receiptMime?: string | null;
  receiptSize?: number | null;
};
