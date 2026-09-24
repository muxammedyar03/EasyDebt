import { paymentRepository } from "@/entities/payment/api";
import { aggregatePaymentsForChart, getEmptyChartPlaceholder, type PaymentChartPoint } from "@/entities/payment/model";

/**
 * SERVICE LAYER - Payments
 *
 * Rules:
 * - DB access only via paymentRepository (entity)
 * - Chart logic in payment entity model
 * - Returns plain objects tailored for callers (DTOs)
 */

export type { PaymentChartPoint };

export class PaymentService {
  /**
   * Get aggregated payments per day by payment type for the dashboard chart.
   */
  async getPaymentsChartData(clientId: number): Promise<PaymentChartPoint[]> {
    const allPayments = await paymentRepository.findMany({ client_id: clientId }, { orderBy: { created_at: "asc" } });
    const chartData = aggregatePaymentsForChart(allPayments);
    return chartData.length === 0 ? getEmptyChartPlaceholder(30) : chartData;
  }
}

export const paymentService = new PaymentService();
