/**
 * Debtor entity – model: overdue calculation.
 * Single source of truth; lib re-exports from here.
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
} from "./overdue";
