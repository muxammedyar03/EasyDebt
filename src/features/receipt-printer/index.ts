/**
 * RECEIPT PRINTER — Public API
 *
 * Feature ning tashqi interfeysi.
 */

// Model
export type { SingleReceiptData, TimelineReceiptData, ReceiptBalanceInfo, ReceiptType } from "./model";

// Lib
export { printReceipt, getReceiptContainerId } from "./lib/print-receipt";
export {
  formatReceiptAmount,
  formatReceiptDate,
  formatReceiptTitle,
  formatPaymentType,
  generateSingleReceiptHtml,
  generateTimelineReceiptHtml,
} from "./lib/format-receipt";

// UI
export {
  SingleReceiptTemplate,
  TimelineReceiptTemplate,
  SingleReceiptPreview,
  TimelineReceiptPreview,
} from "./ui/receipt-template";
export { PrintConfirmDialog } from "./ui/print-confirm-dialog";
export { PrintReceiptButton } from "./ui/print-receipt-button";
