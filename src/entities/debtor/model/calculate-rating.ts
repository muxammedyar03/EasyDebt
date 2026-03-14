/**
 * Debtor entity – model: payment/customer rating calculation.
 * Re-exports from lib so service uses entity as single entry.
 */
export {
  calculatePaymentRating,
  calculateCustomerRating,
  calculateAverageDaysBetweenDebtAndPayment,
  calculatePaymentPercentage,
  isDebtorOverdue,
  type PaymentRating,
} from "@/lib/rating-calculator";
