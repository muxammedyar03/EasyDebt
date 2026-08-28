/**
 * REPORTS SERVICE - Dashboard reports use-case
 *
 * Composes debtorService, paymentService, debtService.
 * No Prisma here; all data access through existing services.
 */

import { type PaymentReportItem, paymentService } from "@/lib/services/payment.service";
import { debtService, type DebtReportItem } from "@/lib/services/debt.service";

export type ReportsDashboardDto = {
  paymentsData: PaymentReportItem[];
  debtsData: DebtReportItem[];
};

class ReportsService {
  async getDashboardReport(clientId: number): Promise<ReportsDashboardDto> {
    const [paymentsData, debtsData] = await Promise.all([
      paymentService.getPaymentsWithDebtorForReport(clientId),
      debtService.getDebtsWithDebtorForReport(clientId),
    ]);

    return {
      paymentsData,
      debtsData,
    };
  }
}

export const reportsService = new ReportsService();
