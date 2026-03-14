/**
 * Debtor entity – model: payment/customer rating calculation.
 * Single source of truth; lib re-exports from here.
 */
export {
  calculatePaymentRating,
  calculateCustomerRating,
  calculateAverageDaysBetweenDebtAndPayment,
  calculatePaymentPercentage,
  isDebtorOverdue,
  type PaymentRating,
} from "./rating";
