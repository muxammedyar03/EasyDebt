import type { Prisma } from "@prisma/client";
import { paymentRepository } from "@/lib/repositories/payment.repository";

/** Payment with debtor for report */
type PaymentWithDebtor = Prisma.PaymentGetPayload<{ include: { debtor: true } }>;

/**
 * SERVICE LAYER - Payments
 *
 * Rules:
 * - DB access only via paymentRepository (and other repos if needed)
 * - Returns plain objects tailored for callers (DTOs)
 * - Dashboard chart uses a simple DTO type (no Prisma in components)
 */

export type PaymentChartPoint = {
  date: string;
  cash: number;
  card: number;
  click: number;
};

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

    const paymentsByDate = new Map<string, { cash: number; card: number; click: number }>();

    allPayments.forEach((payment) => {
      const dateStr = payment.created_at.toISOString().split("T")[0];
      const existing = paymentsByDate.get(dateStr) || { cash: 0, card: 0, click: 0 };

      const amount = payment.amount.toNumber();
      if (payment.payment_type === "CASH") {
        existing.cash += amount;
      } else if (payment.payment_type === "CARD") {
        existing.card += amount;
      } else if (payment.payment_type === "CLICK") {
        existing.click += amount;
      }

      paymentsByDate.set(dateStr, existing);
    });

    let chartData: PaymentChartPoint[] = Array.from(paymentsByDate.entries())
      .map(([date, amounts]) => ({
        date,
        cash: amounts.cash,
        card: amounts.card,
        click: amounts.click,
      }))
      .sort((a, b) => a.date.localeCompare(b.date));

    // If no data, generate sample data for last 30 days
    if (chartData.length === 0) {
      const sampleData: PaymentChartPoint[] = [];
      const today = new Date();
      for (let i = 29; i >= 0; i--) {
        const date = new Date(today);
        date.setDate(date.getDate() - i);
        sampleData.push({
          date: date.toISOString().split("T")[0],
          cash: 0,
          card: 0,
          click: 0,
        });
      }
      chartData = sampleData;
    }

    return chartData;
  }
}

export const paymentService = new PaymentService();
