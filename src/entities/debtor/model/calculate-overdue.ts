/**
 * Debtor entity – model: overdue calculation.
 * Re-exports from lib so service and cron use entity as single entry.
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
} from "@/lib/overdue-calculator";
