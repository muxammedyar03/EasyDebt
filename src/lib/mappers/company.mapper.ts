/**
 * MAPPER LAYER - Company Prisma → Domain → View
 */

import type { Company, CompanyDebt, CompanyPayment, User, CompanyDailySnapshot } from "@prisma/client";
import type { CompanyDomain, CompanyStatus } from "@/types/domain/company.domain";
import type { CompanyDebtDomain } from "@/types/domain/company-debt.domain";
import type { CompanyPaymentDomain } from "@/types/domain/company-payment.domain";
import type { CompanyDailySnapshotDomain } from "@/types/domain/company-daily-snapshot.domain";
import type { CompanyView, CompanyDetailView } from "@/types/view/company.view";
import type { PaymentTypeDomain } from "@/types/domain/payment.domain";
import type { DebtItem } from "@/types/domain/debt.domain";
import { formatCurrencyUzs, formatDateUz, formatUzPhone } from "@/lib/format";
import { calculateCompanyOverdueStatus } from "@/entities/company/model";

export function prismaToDomainCompanyDebt(row: CompanyDebt): CompanyDebtDomain {
  return {
    id: row.id,
    externalId: row.external_id,
    companyId: row.company_id,
    amount: row.amount.toNumber(),
    note: row.note,
    items: row.items as DebtItem[] | null,
    createdAt: row.created_at,
    createdBy: row.created_by,
  };
}

export function prismaToDomainCompanyPayment(row: CompanyPayment): CompanyPaymentDomain {
  return {
    id: row.id,
    externalId: row.external_id,
    companyId: row.company_id,
    amount: row.amount.toNumber(),
    paymentType: row.payment_type as PaymentTypeDomain,
    note: row.note,
    receiptPath: row.receipt_path,
    receiptMime: row.receipt_mime,
    receiptSize: row.receipt_size,
    createdAt: row.created_at,
    createdBy: row.created_by,
  };
}

export function prismaToDomainCompany(
  row: Company & {
    debts?: CompanyDebt[];
    payments?: CompanyPayment[];
    creator?: User;
  },
  options?: { overdueDays?: number },
): CompanyDomain {
  const overdueDays = options?.overdueDays ?? 45;
  const totalDebt = row.total_debt.toNumber();

  const overdue = calculateCompanyOverdueStatus({
    totalDebt,
    lastPaymentDate: row.last_payment_date,
    lastDebtDate: row.last_debt_date,
    createdAt: row.created_at,
    overdueDays,
  });

  return {
    id: row.id,
    externalId: row.external_id,
    name: row.name,
    contactPerson: row.contact_person,
    phoneNumber: row.phone_number,
    address: row.address,
    totalDebt,
    isOverdue: overdue.isOverdue,
    lastPaymentDate: row.last_payment_date,
    lastDebtDate: row.last_debt_date,
    status: computeCompanyStatus(totalDebt, overdue.isOverdue),
    daysOverdue: overdue.daysOverdue,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
    createdBy: row.created_by,
    debts: row.debts?.map(prismaToDomainCompanyDebt),
    payments: row.payments?.map(prismaToDomainCompanyPayment),
    creator: row.creator
      ? {
          id: row.creator.id,
          username: row.creator.username,
          firstName: row.creator.first_name,
          lastName: row.creator.last_name,
        }
      : undefined,
  };
}

export function prismaToDomainCompanyDailySnapshot(row: CompanyDailySnapshot): CompanyDailySnapshotDomain {
  return {
    id: row.id,
    date: row.date,
    totalOutstandingDebt: row.total_outstanding_debt.toNumber(),
    debtsSum: row.debts_sum.toNumber(),
    debtsCount: row.debts_count,
    paymentsSum: row.payments_sum.toNumber(),
    paymentsCount: row.payments_count,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

export function domainToViewCompany(domain: CompanyDomain): CompanyView {
  const totalPaid = domain.payments?.reduce((sum, p) => sum + p.amount, 0) ?? 0;
  const remainingDebt = domain.totalDebt;

  return {
    id: domain.id,
    externalId: domain.externalId,
    name: domain.name,
    contactPerson: domain.contactPerson,
    phoneNumber: domain.phoneNumber,
    phoneDisplay: domain.phoneNumber ? formatUzPhone(domain.phoneNumber) : null,
    address: domain.address,
    totalDebt: domain.totalDebt,
    totalDebtFormatted: formatCurrencyUzs(domain.totalDebt),
    isOverdue: domain.isOverdue,
    lastPaymentDate: domain.lastPaymentDate,
    lastPaymentDateFormatted: domain.lastPaymentDate ? formatDateUz(domain.lastPaymentDate) : null,
    lastDebtDate: domain.lastDebtDate,
    lastDebtDateFormatted: domain.lastDebtDate ? formatDateUz(domain.lastDebtDate) : null,
    status: domain.status,
    statusBadge: getCompanyStatusBadge(domain.status),
    daysOverdue: domain.daysOverdue,
    daysOverdueDisplay: domain.daysOverdue ? `${domain.daysOverdue} kun` : null,
    canEdit: true,
    canDelete: true,
    createdAt: domain.createdAt,
    createdAtFormatted: formatDateUz(domain.createdAt),
    updatedAt: domain.updatedAt,
    updatedAtFormatted: formatDateUz(domain.updatedAt),
    debtsCount: domain.debts?.length,
    paymentsCount: domain.payments?.length,
    totalPaid,
    totalPaidFormatted: formatCurrencyUzs(totalPaid),
    remainingDebt,
    remainingDebtFormatted: formatCurrencyUzs(remainingDebt),
  };
}

export function domainToDetailViewCompany(domain: CompanyDomain): CompanyDetailView {
  const view = domainToViewCompany(domain);

  return {
    ...view,
    debts: (domain.debts ?? []).map((debt) => ({
      id: debt.id,
      amount: debt.amount,
      amountFormatted: formatCurrencyUzs(debt.amount),
      note: debt.note,
      createdAt: debt.createdAt,
      createdAtFormatted: formatDateUz(debt.createdAt),
    })),
    payments: (domain.payments ?? []).map((payment) => ({
      id: payment.id,
      amount: payment.amount,
      amountFormatted: formatCurrencyUzs(payment.amount),
      paymentType: payment.paymentType,
      note: payment.note,
      receiptPath: payment.receiptPath,
      createdAt: payment.createdAt,
      createdAtFormatted: formatDateUz(payment.createdAt),
    })),
  };
}

function computeCompanyStatus(totalDebt: number, isOverdue: boolean): CompanyStatus {
  if (totalDebt <= 0) return "paid_off";
  if (isOverdue) return "overdue";
  return "active";
}

function getCompanyStatusBadge(status: CompanyStatus): CompanyView["statusBadge"] {
  const badges = {
    active: { label: "Qarzdor", variant: "default" as const },
    overdue: { label: "Muddati o'tgan", variant: "destructive" as const },
    paid_off: { label: "To'langan", variant: "secondary" as const },
    inactive: { label: "Nofaol", variant: "outline" as const },
  };
  return badges[status];
}
