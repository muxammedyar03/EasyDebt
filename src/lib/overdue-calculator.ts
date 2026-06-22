/**
 * Re-export: overdue logic lives in entity model.
 * @see src/entities/debtor/model/overdue.ts
 */
export {
  calculateDebtorOverdueStatus,
  calculateDebtOverdueStatus,
  computeDebtorOverdueStatus,
  getDefaultOverdueSettings,
  parseOverdueSettings,
  type DebtWithPayments,
  type OverdueSettings,
  type OverdueStatus,
} from "@/entities/debtor/model";
