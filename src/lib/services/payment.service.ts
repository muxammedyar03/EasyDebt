import { prisma } from "@/lib/prisma";

/**
 * SERVICE LAYER - Payments
 *
 * Rules:
 * - Prisma queries are allowed here
 * - Returns plain objects tailored for callers (DTOs)
 * - Dashboard chart uses a simple DTO type (no Prisma in components)
 */

export type PaymentChartPoint = {
  date: string;
  cash: number;
  card: number;
  click: number;
};

export class PaymentService {
  /**
   * Get aggregated payments per day by payment type for the dashboard chart.
   *
   * - Groups by date (YYYY-MM-DD)
   * - Sums amounts per payment_type
   * - Returns sorted by date asc
   * - If no data, returns last 30 days with zeros (for stable chart)
   */
  async getPaymentsChartData(): Promise<PaymentChartPoint[]> {
    const allPayments = await prisma.payment.findMany({
      orderBy: {
        created_at: "asc",
      },
    });

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
