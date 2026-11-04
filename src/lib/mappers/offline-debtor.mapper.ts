import type { OfflineDebtorItem } from "@/types/offline";
import type { DebtorDomain, DebtDomain, PaymentDomain } from "@/types/domain";
import { PaymentTypeDomain } from "@/types/domain/payment.domain";

/**
 * Maps an OfflineDebtorItem from IndexedDB into a full DebtorDomain entity
 * Layer: lib/mappers
 */
export function offlineDebtorToDomain(offline: OfflineDebtorItem, clientId = 1): DebtorDomain {
  const debts: DebtDomain[] = (offline.debts || []).map((d) => ({
    id: d.id,
    externalId: d.external_id || String(d.id),
    debtorId: d.debtor_id,
    amount: Number(d.amount || 0),
    description: d.description,
    items: null,
    createdAt: new Date(d.created_at),
    createdBy: 1,
  }));

  const payments: PaymentDomain[] = (offline.payments || []).map((p) => {
    let pType = PaymentTypeDomain.CASH;
    if (p.payment_type === "CLICK") pType = PaymentTypeDomain.CLICK;
    else if (p.payment_type === "CARD") pType = PaymentTypeDomain.CARD;

    return {
      id: p.id,
      externalId: p.external_id || String(p.id),
      debtorId: p.debtor_id,
      amount: Number(p.amount || 0),
      paymentType: pType,
      note: p.note,
      resetsRating: Boolean(p.resets_rating),
      createdAt: new Date(p.created_at),
      createdBy: 1,
    };
  });

  return {
    id: offline.id,
    externalId: offline.external_id,
    clientId,
    firstName: offline.first_name,
    lastName: offline.last_name,
    phoneNumber: offline.phone_number,
    address: offline.address,
    totalDebt: Number(offline.total_debt || 0),
    isOverdue: Boolean(offline.is_overdue),
    lastPaymentDate: payments.length ? payments[0].createdAt : null,
    riskStatus: offline.is_overdue ? "high" : "low",
    status: offline.total_debt <= 0 ? "paid_off" : offline.is_overdue ? "overdue" : "active",
    daysOverdue: offline.is_overdue ? 30 : null,
    createdAt: new Date(offline.created_at),
    updatedAt: new Date(offline.updated_at),
    createdBy: 1,
    debts,
    payments,
  };
}
