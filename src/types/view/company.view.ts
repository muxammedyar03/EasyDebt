/**
 * VIEW LAYER - Company presentation types
 */

import type { CompanyStatus } from "../domain/company.domain";

export type CompanyView = {
  id: number;
  externalId: string;
  name: string;
  contactPerson: string | null;
  phoneNumber: string | null;
  phoneDisplay: string | null;
  address: string | null;
  totalDebt: number;
  totalDebtFormatted: string;
  isOverdue: boolean;
  lastPaymentDate: Date | null;
  lastPaymentDateFormatted: string | null;
  lastDebtDate: Date | null;
  lastDebtDateFormatted: string | null;
  status: CompanyStatus;
  statusBadge: {
    label: string;
    variant: "default" | "destructive" | "secondary" | "outline";
  };
  daysOverdue: number | null;
  daysOverdueDisplay: string | null;
  canEdit: boolean;
  canDelete: boolean;
  createdAt: Date;
  createdAtFormatted: string;
  updatedAt: Date;
  updatedAtFormatted: string;
  debtsCount?: number;
  paymentsCount?: number;
  totalPaid?: number;
  totalPaidFormatted?: string;
  remainingDebt?: number;
  remainingDebtFormatted?: string;
};

export type CompanyDetailView = CompanyView & {
  debts: Array<{
    id: number;
    amount: number;
    amountFormatted: string;
    note: string | null;
    createdAt: Date;
    createdAtFormatted: string;
  }>;
  payments: Array<{
    id: number;
    amount: number;
    amountFormatted: string;
    paymentType: string;
    note: string | null;
    receiptPath: string | null;
    createdAt: Date;
    createdAtFormatted: string;
  }>;
};
