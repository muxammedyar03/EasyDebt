/**
 * RECEIPT PRINTER — Type Definitions
 *
 * Termal chek printer uchun ma'lumot tuzilmalari.
 * Yakka tranzaksiya cheklari va butun timeline cheklari uchun.
 */

export type ReceiptType = "DEBT" | "PAYMENT";

/**
 * Yakka tranzaksiya chek ma'lumotlari
 * (Qarz qo'shilganda yoki to'lov qabul qilinganda)
 */
export interface SingleReceiptData {
  type: ReceiptType;
  docNumber: string | number;
  date: Date;
  debtorName: string;
  debtorPhone: string | null;
  employeeName: string | null;
  amount: number;
  paymentType?: "CASH" | "CLICK" | "CARD";
  description?: string | null;
  previousBalance: number;
  newBalance: number;
}

/**
 * Timeline chek ma'lumotlari
 * (Butun tarix — debtor detail page dan)
 */
export interface TimelineReceiptData {
  debtorName: string;
  debtorPhone: string | null;
  debtorAddress: string | null;
  employeeName: string | null;
  timeline: Array<{
    type: "DEBT" | "PAYMENT";
    amount: number;
    date: Date;
    description?: string | null;
    paymentType?: "CASH" | "CLICK" | "CARD";
  }>;
  totalDebt: number;
  totalPaid: number;
  remaining: number;
  generatedAt: Date;
}

/**
 * API response dan keladigan balance ma'lumotlari
 */
export interface ReceiptBalanceInfo {
  previousBalance: number;
  newBalance: number;
  debtorName: string;
  debtorPhone: string | null;
  employeeName: string | null;
}
