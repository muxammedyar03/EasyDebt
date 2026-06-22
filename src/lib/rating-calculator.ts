/**
 * Re-export: rating logic lives in entity model.
 * @see src/entities/debtor/model/rating.ts
 */
export {
  calculatePaymentRating,
  calculateCustomerRating,
  calculateAverageDaysBetweenDebtAndPayment,
  calculatePaymentPercentage,
  isDebtorOverdue,
  type PaymentRating,
} from "@/entities/debtor/model";
