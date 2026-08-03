/**
 * DOMAIN LAYER - Company daily snapshot / day activity
 */

export type CompanyDailySnapshotDomain = {
  id: number;
  date: Date;
  totalOutstandingDebt: number;
  debtsSum: number;
  debtsCount: number;
  paymentsSum: number;
  paymentsCount: number;
  createdAt: Date;
  updatedAt: Date;
};

export type CompanyDayDebtActivity = {
  id: number;
  companyId: number;
  companyName: string;
  amount: number;
  note: string;
  createdAt: Date;
};

export type CompanyDayPaymentActivity = {
  id: number;
  companyId: number;
  companyName: string;
  amount: number;
  note: string;
  paymentType: string;
  createdAt: Date;
};

export type CompanyDayActivityDomain = {
  date: Date;
  snapshot: CompanyDailySnapshotDomain | null;
  debts: CompanyDayDebtActivity[];
  payments: CompanyDayPaymentActivity[];
};

export type UpsertCompanyDailySnapshotInput = {
  date: Date;
  totalOutstandingDebt: number;
  debtsSum: number;
  debtsCount: number;
  paymentsSum: number;
  paymentsCount: number;
};
