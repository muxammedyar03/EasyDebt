/**
 * Unit tests for debtor entity model: calculatePaymentRating.
 * Covers input/output and boundary values (overdueDays thresholds).
 */

import { expect } from "@playwright/test";
import { calculatePaymentRating, type PaymentRating } from "../rating";

const OVERDUE_DAYS = 45;

function daysAgo(days: number): Date {
  const d = new Date();
  d.setDate(d.getDate() - days);
  return d;
}

describe("calculatePaymentRating", () => {
  describe("input / output", () => {
    it("returns default rating when no debts", () => {
      const result = calculatePaymentRating([], [], OVERDUE_DAYS);
      expect(result).toMatchObject({
        label: "Yaxshi",
        color: "text-orange-600",
      });
      expect(typeof result.score).toBe("number");
    });

    it("returns A'lo when total debt is zero (fully paid)", () => {
      const debtDate = daysAgo(60);
      const payDate = daysAgo(30);
      const result = calculatePaymentRating(
        [{ amount: 1000, createdAt: debtDate }],
        [{ amount: 1000, createdAt: payDate }],
        OVERDUE_DAYS,
        0,
      );
      expect(result).toMatchObject({
        score: 0,
        label: "A'lo",
        color: "text-green-600",
      });
    });

    it("returns correct label and color for debt with no payments (many days ago)", () => {
      const debtDate = daysAgo(60);
      const result = calculatePaymentRating([{ amount: 1000, createdAt: debtDate }], [], OVERDUE_DAYS);
      expect(result.label).toBe("Yomon");
      expect(result.color).toBe("text-red-600");
      expect(result.score).toBeGreaterThanOrEqual(59);
    });
  });

  describe("boundary values (overdueDays = 45)", () => {
    it("A'lo when avgDays <= 15 (e.g. paid early or very recent debt)", () => {
      const debtDate = daysAgo(10);
      const result = calculatePaymentRating([{ amount: 1000, createdAt: debtDate }], [], OVERDUE_DAYS, 1000);
      expect(result.label).toBe("A'lo");
      expect(result.color).toBe("text-green-600");
    });

    it("Yaxshi when avgDays in (15, 30]", () => {
      const debtDate = daysAgo(25);
      const result = calculatePaymentRating([{ amount: 1000, createdAt: debtDate }], [], OVERDUE_DAYS, 1000);
      expect(result.label).toBe("Yaxshi");
      expect(result.color).toBe("text-emerald-600");
    });

    it("O'rtacha when avgDays in (30, 45]", () => {
      const debtDate = daysAgo(38);
      const result = calculatePaymentRating([{ amount: 1000, createdAt: debtDate }], [], OVERDUE_DAYS, 1000);
      expect(result.label).toBe("O'rtacha");
      expect(result.color).toBe("text-yellow-600");
    });

    it("Yomon when avgDays > 45", () => {
      const debtDate = daysAgo(50);
      const result = calculatePaymentRating([{ amount: 1000, createdAt: debtDate }], [], OVERDUE_DAYS, 1000);
      expect(result.label).toBe("Yomon");
      expect(result.color).toBe("text-red-600");
    });
  });

  describe("50%+ payment reset", () => {
    it("uses last 50%+ payment date for avgDays when applicable", () => {
      const debtDate = daysAgo(100);
      const paymentDate = daysAgo(10);
      const result = calculatePaymentRating(
        [{ amount: 1000, createdAt: debtDate }],
        [{ amount: 600, createdAt: paymentDate }],
        OVERDUE_DAYS,
        400,
      );
      expect(result.label).toBe("A'lo");
      expect(result.score).toBeLessThanOrEqual(15);
    });

    it("resets avgDays when payment has resetsRating even if under 50%", () => {
      const debtDate = daysAgo(100);
      const paymentDate = daysAgo(0);
      const result = calculatePaymentRating(
        [{ amount: 1000, createdAt: debtDate }],
        [{ amount: 100, createdAt: paymentDate, resetsRating: true }],
        OVERDUE_DAYS,
        900,
      );
      expect(result.score).toBe(0);
      expect(result.label).toBe("A'lo");
    });
  });

  describe("return shape", () => {
    it("returns PaymentRating with score, label, color", () => {
      const result = calculatePaymentRating([{ amount: 500, createdAt: daysAgo(5) }], [], OVERDUE_DAYS);
      expect(result).toHaveProperty("score");
      expect(result).toHaveProperty("label");
      expect(result).toHaveProperty("color");
      const validLabels: PaymentRating["label"][] = ["Yomon", "O'rtacha", "Yaxshi", "A'lo"];
      expect(validLabels).toContain(result.label);
    });
  });
});
