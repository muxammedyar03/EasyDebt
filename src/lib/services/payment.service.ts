import type { Prisma } from "@prisma/client";
import { paymentRepository } from "@/entities/payment/api";
import { aggregatePaymentsForChart, getEmptyChartPlaceholder, type PaymentChartPoint } from "@/entities/payment/model";

/** Payment with debtor for report */
type PaymentWithDebtor = Prisma.PaymentGetPayload<{ include: { debtor: true } }>;

/**
 * SERVICE LAYER - Payments
 *
 * Rules:
 * - DB access only via paymentRepository (entity)
 * - Chart logic in payment entity model
 * - Returns plain objects tailored for callers (DTOs)
 */

export type { PaymentChartPoint };

export type PaymentReportItem = {
  id: number;
  debtor_id: number;
  debtor_external_id: string;
  debtor_name: string;
  debitor_total_debt: number;
  debitor_is_overdue: boolean;
  amount: number;
  payment_type: "CASH" | "CARD" | "CLICK";
  note: string | null;
  created_at: string;
  created_by: number;
};

export class PaymentService {
  // async getTotalCount(): Promise<number> {
  //   return prisma.payment.count();
  // }

  // async getPaymentsInDateRange(from: Date, to: Date): Promise<{ sum: number; count: number }> {
  //   const [payments, agg] = await Promise.all([
  //     prisma.payment.findMany({
  //       where: { created_at: { gte: from, lte: to } },
  //     }),
  //     prisma.payment.aggregate({
  //       _sum: { amount: true },
  //       where: { created_at: { gte: from, lte: to } },
  //     }),
  //   ]);
  //   return {
  //     sum: agg._sum.amount?.toNumber() ?? 0,
  //     count: payments.length,
  //   };
  // }

  async getPaymentsWithDebtorForReport(): Promise<PaymentReportItem[]> {
    const payments = (await paymentRepository.findMany(
      {},
      { include: { debtor: true }, orderBy: { created_at: "desc" } },
    )) as PaymentWithDebtor[];
    return payments.map((p) => ({
      id: p.id,
      debtor_id: p.debtor_id,
      debtor_external_id: p.debtor.external_id,
      debtor_name: `${p.debtor.first_name} ${p.debtor.last_name}`,
      debitor_total_debt: p.debtor.total_debt.toNumber(),
      debitor_is_overdue: p.debtor.is_overdue,
      amount: p.amount.toNumber(),
      payment_type: p.payment_type,
      note: p.note,
      created_at: p.created_at.toISOString(),
      created_by: p.created_by,
    }));
  }

  /**
   * Get aggregated payments per day by payment type for the dashboard chart.
   *
   * - Groups by date (YYYY-MM-DD)
   * - Sums amounts per payment_type
   * - Returns sorted by date asc
   * - If no data, returns last 30 days with zeros (for stable chart)
   */
  async getPaymentsChartData(): Promise<PaymentChartPoint[]> {
    const allPayments = await paymentRepository.findMany({}, { orderBy: { created_at: "asc" } });
    const chartData = aggregatePaymentsForChart(allPayments);
    return chartData.length === 0 ? getEmptyChartPlaceholder(30) : chartData;
  }
}

export const paymentService = new PaymentService();
