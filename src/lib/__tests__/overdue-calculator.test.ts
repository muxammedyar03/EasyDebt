/**
 * Test suite for overdue calculator
 * Validates the critical bug fix: earliest unpaid debt is used as start date
 */

import { calculateDebtorOverdueStatus, type DebtWithPayments, type OverdueSettings } from "../overdue-calculator";

describe("Overdue Calculator - Critical Bug Fix", () => {
  const settings: OverdueSettings = {
    goodUntilDays: 30,
    mediumUntilDays: 45,
    minPaidPercent: 0.5,
  };

  describe("Scenario 1: Multiple unpaid debts - earliest date is used", () => {
    it("should use Oct 22 (earliest) as start, not Jan 11 (latest)", () => {
      const debts: DebtWithPayments[] = [
        {
          amount: 1000,
          createdAt: new Date("2025-10-22"),
          payments: [], // No payments
        },
        {
          amount: 500,
          createdAt: new Date("2026-01-11"),
          payments: [], // No payments
        },
      ];

      const result = calculateDebtorOverdueStatus(debts, settings);

      // Calculate expected days from Oct 22 to today
      const oct22 = new Date("2025-10-22");
      const today = new Date();
      const expectedDays = Math.floor((today.getTime() - oct22.getTime()) / (1000 * 60 * 60 * 24));

      expect(result.overdueDays).toBe(expectedDays);
      expect(result.overdueDays).toBeGreaterThan(80); // Should be ~90+ days
      expect(result.status).toBe("bad");
      expect(result.isOverdue).toBe(true);
    });

    it("should NOT use Jan 11 as start (would give only ~28 days)", () => {
      const debts: DebtWithPayments[] = [
        {
          amount: 1000,
          createdAt: new Date("2025-10-22"),
          payments: [],
        },
        {
          amount: 500,
          createdAt: new Date("2026-01-11"),
          payments: [],
        },
      ];

      const result = calculateDebtorOverdueStatus(debts, settings);

      // If using Jan 11 (wrong), would be ~28 days
      expect(result.overdueDays).not.toBeLessThan(80);
      expect(result.overdueDays).not.toBe(28);
    });
  });

  describe("Scenario 2: New debt does NOT reset overdue counter", () => {
    it("should keep counting from oldest unpaid debt even after new debt added", () => {
      const debts: DebtWithPayments[] = [
        {
          amount: 1000,
          createdAt: new Date("2025-10-22"),
          payments: [],
        },
        {
          amount: 500,
          createdAt: new Date("2026-01-11"), // New debt added recently
          payments: [],
        },
      ];

      const result = calculateDebtorOverdueStatus(debts, settings);

      // Should still count from Oct 22, not reset by Jan 11
      expect(result.overdueDays).toBeGreaterThan(80);
      expect(result.status).toBe("bad");
    });
  });

  describe("Scenario 3: Paid debt is excluded from overdue calculation", () => {
    it("should ignore debts that reached 50% payment threshold", () => {
      const debts: DebtWithPayments[] = [
        {
          amount: 1000,
          createdAt: new Date("2025-10-22"),
          payments: [
            { amount: 600, createdAt: new Date("2025-11-01") }, // 60% paid
          ],
        },
        {
          amount: 500,
          createdAt: new Date("2026-01-11"),
          payments: [], // 0% paid
        },
      ];

      const result = calculateDebtorOverdueStatus(debts, settings);

      // Should use Jan 11 as start (first unpaid debt)
      const jan11 = new Date("2026-01-11");
      const today = new Date();
      const expectedDays = Math.floor((today.getTime() - jan11.getTime()) / (1000 * 60 * 60 * 24));

      expect(result.overdueDays).toBe(expectedDays);
      expect(result.overdueDays).toBeLessThan(50); // Should be ~28 days
    });
  });

  describe("Scenario 4: All debts paid above threshold", () => {
    it("should return good status when all debts are paid >= 50%", () => {
      const debts: DebtWithPayments[] = [
        {
          amount: 1000,
          createdAt: new Date("2025-10-22"),
          payments: [{ amount: 600, createdAt: new Date("2025-11-01") }],
        },
        {
          amount: 500,
          createdAt: new Date("2026-01-11"),
          payments: [{ amount: 300, createdAt: new Date("2026-01-15") }],
        },
      ];

      const result = calculateDebtorOverdueStatus(debts, settings);

      expect(result.status).toBe("good");
      expect(result.isOverdue).toBe(false);
      expect(result.overdueDays).toBe(0);
    });
  });

  describe("Scenario 5: Aggregate payment percentage matters", () => {
    it("should consider total paid across all debts", () => {
      const debts: DebtWithPayments[] = [
        {
          amount: 1000,
          createdAt: new Date("2025-10-22"),
          payments: [{ amount: 400, createdAt: new Date("2025-11-01") }], // 40%
        },
        {
          amount: 1000,
          createdAt: new Date("2026-01-11"),
          payments: [{ amount: 600, createdAt: new Date("2026-01-15") }], // 60%
        },
      ];

      const result = calculateDebtorOverdueStatus(debts, settings);

      // Total: 1000 paid / 2000 total = 50% → good status
      expect(result.status).toBe("good");
      expect(result.isOverdue).toBe(false);
      expect(result.paidPercent).toBe(0.5);
    });
  });

  describe("Scenario 6: Status thresholds work correctly", () => {
    it("should return 'good' when overdue_days <= good_until_days (30)", () => {
      const debts: DebtWithPayments[] = [
        {
          amount: 1000,
          createdAt: new Date(new Date().getTime() - 20 * 24 * 60 * 60 * 1000), // 20 days ago
          payments: [],
        },
      ];

      const result = calculateDebtorOverdueStatus(debts, settings);

      expect(result.overdueDays).toBeLessThanOrEqual(30);
      expect(result.status).toBe("good");
      expect(result.isOverdue).toBe(false);
    });

    it("should return 'medium' when good_until_days < overdue_days <= medium_until_days", () => {
      const debts: DebtWithPayments[] = [
        {
          amount: 1000,
          createdAt: new Date(new Date().getTime() - 40 * 24 * 60 * 60 * 1000), // 40 days ago
          payments: [],
        },
      ];

      const result = calculateDebtorOverdueStatus(debts, settings);

      expect(result.overdueDays).toBeGreaterThan(30);
      expect(result.overdueDays).toBeLessThanOrEqual(45);
      expect(result.status).toBe("medium");
      expect(result.isOverdue).toBe(false);
    });

    it("should return 'bad' when overdue_days > medium_until_days (45)", () => {
      const debts: DebtWithPayments[] = [
        {
          amount: 1000,
          createdAt: new Date(new Date().getTime() - 60 * 24 * 60 * 60 * 1000), // 60 days ago
          payments: [],
        },
      ];

      const result = calculateDebtorOverdueStatus(debts, settings);

      expect(result.overdueDays).toBeGreaterThan(45);
      expect(result.status).toBe("bad");
      expect(result.isOverdue).toBe(true);
    });
  });

  describe("Scenario 7: Empty debts", () => {
    it("should return good status when no debts", () => {
      const result = calculateDebtorOverdueStatus([], settings);

      expect(result.status).toBe("good");
      expect(result.isOverdue).toBe(false);
      expect(result.overdueDays).toBe(0);
      expect(result.paidPercent).toBe(1);
    });
  });

  describe("Scenario 8: Real-world case from bug report", () => {
    it("should correctly handle Oct 22 + Jan 11 case", () => {
      const debts: DebtWithPayments[] = [
        {
          amount: 1000,
          createdAt: new Date("2025-10-22"),
          payments: [],
        },
        {
          amount: 500,
          createdAt: new Date("2026-01-11"),
          payments: [],
        },
      ];

      const result = calculateDebtorOverdueStatus(debts, settings);

      // Before fix: would show ~28 days (using Jan 11)
      // After fix: shows ~90+ days (using Oct 22)
      expect(result.overdueDays).toBeGreaterThan(80);
      expect(result.status).toBe("bad");
      expect(result.isOverdue).toBe(true);

      // Verify it's NOT using the wrong date
      const wrongDays = Math.floor((new Date().getTime() - new Date("2026-01-11").getTime()) / (1000 * 60 * 60 * 24));
      expect(result.overdueDays).not.toBe(wrongDays);
    });
  });
});
