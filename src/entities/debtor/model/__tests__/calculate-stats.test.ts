import { buildDebtorStats } from "../calculate-stats";

describe("buildDebtorStats", () => {
  it("should return DebtorStats from raw input", () => {
    const raw = {
      totalDebtors: 10,
      totalDebt: 5_000_000,
      totalDebtsCount: 3,
      todayDebtsCount: 2,
      todayDebtsAmount: 1_000_000,
      todayPaymentsCount: 4,
      todayPaymentsAmount: 2_000_000,
    };
    const stats = buildDebtorStats(raw);
    expect(stats.totalDebtors).toBe(10);
    expect(stats.totalDebt).toBe(5_000_000);
    expect(stats.totalDebtsCount).toBe(3);
    expect(stats.todayDebtsCount).toBe(2);
    expect(stats.todayDebtsAmount).toBe(1_000_000);
    expect(stats.todayPaymentsCount).toBe(4);
    expect(stats.todayPaymentsAmount).toBe(2_000_000);
  });

  it("should handle zeros", () => {
    const raw = {
      totalDebtors: 0,
      totalDebt: 0,
      totalDebtsCount: 0,
      todayDebtsCount: 0,
      todayDebtsAmount: 0,
      todayPaymentsCount: 0,
      todayPaymentsAmount: 0,
    };
    const stats = buildDebtorStats(raw);
    expect(stats.totalDebtors).toBe(0);
    expect(stats.todayPaymentsAmount).toBe(0);
  });
});
