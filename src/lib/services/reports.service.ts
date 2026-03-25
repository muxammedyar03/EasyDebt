/**
 * REPORTS SERVICE - Dashboard reports use-case
 *
 * Composes debtorService, paymentService, debtService.
 * No Prisma here; all data access through existing services.
 */

// import { debtorService } from "@/lib/services/debtor.service";
import { type PaymentReportItem, paymentService } from "@/lib/services/payment.service";
import { debtService, type DebtReportItem } from "@/lib/services/debt.service";
import { debtorRepository } from "@/entities";
import { getEffectiveShopId } from "../shop-context";

// export type TrendItem = {
//   label: string;
//   current: number;
//   previous: number;
//   format: "currency" | "number";
// };

export type ReportsDashboardDto = {
  // debtLimit: number;
  // totalDebtors: number;
  // highRiskCount: number;
  // mediumRiskCount: number;
  // lowRiskCount: number;
  // overdueCount: number;
  // totalPaymentsAmount: number;
  // totalPaymentsCount: number;
  // totalDebtsAmount: number;
  // totalDebtsCount: number;
  // trends: TrendItem[];
  paymentsData: PaymentReportItem[];
  debtsData: DebtReportItem[];
};

class ReportsService {
  async getDashboardReport(shopId: number): Promise<ReportsDashboardDto> {
    // const debtLimit = await debtService.debtLimit();
    // const now = new Date();
    // const currentMonthStart = new Date(now.getFullYear(), now.getMonth(), 1);
    // const previousMonthStart = new Date(now.getFullYear(), now.getMonth() - 1, 1);
    // const previousMonthEnd = new Date(now.getFullYear(), now.getMonth(), 0);

    // const [
    //   debtorsResult,
    //   overdueResult,
    //   currentMonthPayments,
    //   previousMonthPayments,
    //   currentMonthDebts,
    //   previousMonthDebts,
    //   paymentsData,
    //   debtsData,
    //   totalPaymentsAmount,
    //   totalPaymentsCount,
    //   totalDebtsAmount,
    //   totalDebtsCount,
    // ] = await Promise.all([
    //   debtorService.findMany(undefined, { page: 1, limit: 100_000 }),
    //   debtorService.findMany({ isOverdue: true }, { page: 1, limit: 1 }),
    //   paymentService.getPaymentsInDateRange(currentMonthStart, now),
    //   paymentService.getPaymentsInDateRange(previousMonthStart, previousMonthEnd),
    //   debtService.getDebtsInDateRange(currentMonthStart, now),
    //   debtService.getDebtsInDateRange(previousMonthStart, previousMonthEnd),
    const [paymentsData, debtsData] = await Promise.all([
      paymentService.getPaymentsWithDebtorForReport(shopId),
      debtService.getDebtsWithDebtorForReport(shopId),
      // debtorService.debtorsTotalPayments(),
      // paymentService.getTotalCount(),
      // debtorService.debtorsTotalDebts(),
      // debtService.getTotalCount(),
    ]);

    // const debtors = debtorsResult.data;
    // const totalDebtors = debtorsResult.total;
    // const overdueCount = overdueResult.total;

    // const highRiskCount = debtors.filter((d) => d.totalDebt > debtLimit && d.totalDebt > 0).length;
    // const mediumRiskCount = debtors.filter(
    //   (d) => d.totalDebt > 0 && d.totalDebt <= debtLimit && !d.isOverdue,
    // ).length;
    // const lowRiskCount = debtors.filter((d) => d.totalDebt <= 0).length;

    // const trends: TrendItem[] = [
    //   {
    //     label: "To'lovlar",
    //     current: currentMonthPayments.sum,
    //     previous: previousMonthPayments.sum,
    //     format: "currency",
    //   },
    //   {
    //     label: "Qarzlar",
    //     current: currentMonthDebts.sum,
    //     previous: previousMonthDebts.sum,
    //     format: "currency",
    //   },
    //   {
    //     label: "To'lovlar soni",
    //     current: currentMonthPayments.count,
    //     previous: previousMonthPayments.count,
    //     format: "number",
    //   },
    // ];

    return {
      // debtLimit,
      // totalDebtors,
      // highRiskCount,
      // mediumRiskCount,
      // lowRiskCount,
      // overdueCount,
      // totalPaymentsAmount,
      // totalPaymentsCount,
      // totalDebtsAmount,
      // totalDebtsCount,
      // trends,
      paymentsData,
      debtsData,
    };
  }
}

export const reportsService = new ReportsService();
