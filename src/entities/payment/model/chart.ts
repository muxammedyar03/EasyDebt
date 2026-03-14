/**
 * Payment entity – model: chart aggregation.
 * Groups payments by date and payment type; builds empty placeholder when no data.
 */

export type PaymentChartPoint = {
  date: string;
  cash: number;
  card: number;
  click: number;
};

type PaymentRow = {
  amount: { toNumber(): number };
  payment_type: string;
  created_at: Date;
};

/**
 * Aggregate payments by date (YYYY-MM-DD) and payment type.
 * Returns array sorted by date asc.
 */
export function aggregatePaymentsForChart(payments: PaymentRow[]): PaymentChartPoint[] {
  const byDate = new Map<string, { cash: number; card: number; click: number }>();

  for (const payment of payments) {
    const dateStr = payment.created_at.toISOString().split("T")[0];
    const existing = byDate.get(dateStr) ?? { cash: 0, card: 0, click: 0 };
    const amount = payment.amount.toNumber();
    if (payment.payment_type === "CASH") {
      existing.cash += amount;
    } else if (payment.payment_type === "CARD") {
      existing.card += amount;
    } else if (payment.payment_type === "CLICK") {
      existing.click += amount;
    }
    byDate.set(dateStr, existing);
  }

  return Array.from(byDate.entries())
    .map(([date, amounts]) => ({ date, cash: amounts.cash, card: amounts.card, click: amounts.click }))
    .sort((a, b) => a.date.localeCompare(b.date));
}

/**
 * Last N days with zero amounts (for stable chart when no data).
 */
export function getEmptyChartPlaceholder(days: number = 30): PaymentChartPoint[] {
  const out: PaymentChartPoint[] = [];
  const today = new Date();
  for (let i = days - 1; i >= 0; i--) {
    const d = new Date(today);
    d.setDate(d.getDate() - i);
    out.push({
      date: d.toISOString().split("T")[0],
      cash: 0,
      card: 0,
      click: 0,
    });
  }
  return out;
}
