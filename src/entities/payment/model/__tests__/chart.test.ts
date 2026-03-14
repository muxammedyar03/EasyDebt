/**
 * Unit tests for payment entity model: aggregatePaymentsForChart, getEmptyChartPlaceholder.
 */

import { aggregatePaymentsForChart, getEmptyChartPlaceholder, type PaymentChartPoint } from "../chart";

function row(amount: number, paymentType: string, created_at: Date) {
  return {
    amount: { toNumber: () => amount },
    payment_type: paymentType,
    created_at,
  };
}

describe("aggregatePaymentsForChart", () => {
  it("returns empty array when no payments", () => {
    expect(aggregatePaymentsForChart([])).toEqual([]);
  });

  it("aggregates by date (YYYY-MM-DD) and payment type", () => {
    const d1 = new Date("2025-03-01T12:00:00Z");
    const d2 = new Date("2025-03-01T14:00:00Z");
    const payments = [row(100, "CASH", d1), row(50, "CASH", d2), row(200, "CARD", d1), row(75, "CLICK", d2)];
    const result = aggregatePaymentsForChart(payments);
    expect(result).toHaveLength(1);
    expect(result[0]).toEqual({
      date: "2025-03-01",
      cash: 150,
      card: 200,
      click: 75,
    });
  });

  it("sorts result by date ascending", () => {
    const payments = [
      row(1, "CASH", new Date("2025-03-03T00:00:00Z")),
      row(1, "CASH", new Date("2025-03-01T00:00:00Z")),
      row(1, "CASH", new Date("2025-03-02T00:00:00Z")),
    ];
    const result = aggregatePaymentsForChart(payments);
    expect(result.map((p) => p.date)).toEqual(["2025-03-01", "2025-03-02", "2025-03-03"]);
  });

  it("ignores unknown payment types (no crash, only CASH/CARD/CLICK counted)", () => {
    const payments = [
      row(100, "CASH", new Date("2025-03-01T00:00:00Z")),
      row(50, "OTHER", new Date("2025-03-01T00:00:00Z")),
    ];
    const result = aggregatePaymentsForChart(payments);
    expect(result[0].cash).toBe(100);
    expect(result[0].card).toBe(0);
    expect(result[0].click).toBe(0);
  });
});

describe("getEmptyChartPlaceholder", () => {
  it("returns array of length equal to days", () => {
    expect(getEmptyChartPlaceholder(30)).toHaveLength(30);
    expect(getEmptyChartPlaceholder(7)).toHaveLength(7);
    expect(getEmptyChartPlaceholder(1)).toHaveLength(1);
  });

  it("each point has date, cash, card, click with zero amounts", () => {
    const result = getEmptyChartPlaceholder(5);
    for (const point of result) {
      expect(point).toMatchObject({
        cash: 0,
        card: 0,
        click: 0,
      });
      expect(point.date).toMatch(/^\d{4}-\d{2}-\d{2}$/);
    }
  });

  it("default 30 days when days not provided", () => {
    const result = getEmptyChartPlaceholder();
    expect(result).toHaveLength(30);
  });

  it("returns consecutive dates (last N days)", () => {
    const result = getEmptyChartPlaceholder(3);
    const dates = result.map((p) => p.date);
    const parsed = dates.map((d) => new Date(d).getTime());
    for (let i = 1; i < parsed.length; i++) {
      expect(parsed[i] - parsed[i - 1]).toBe(24 * 60 * 60 * 1000);
    }
  });
});
