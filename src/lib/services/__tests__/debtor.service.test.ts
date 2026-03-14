/**
 * DebtorService tests: getStats() and getCustomerRatings() with mocked repositories.
 */
import { DebtorService } from "../debtor.service";

const mockDebtorCount = jest.fn();
const mockDebtorAggregate = jest.fn();
const mockDebtCount = jest.fn();
const mockDebtAggregate = jest.fn();
const mockDebtFindMany = jest.fn();
const mockPaymentCount = jest.fn();
const mockPaymentAggregate = jest.fn();
const mockPaymentFindMany = jest.fn();
const mockGetDebtLimit = jest.fn();
const mockGetOverdueDays = jest.fn();

jest.mock("@/entities/debtor/api", () => ({
  debtorRepository: {
    count: (...args: unknown[]) => mockDebtorCount(...args),
    aggregate: (...args: unknown[]) => mockDebtorAggregate(...args),
  },
}));

jest.mock("@/entities/debt/api", () => ({
  debtRepository: {
    count: (...args: unknown[]) => mockDebtCount(...args),
    aggregate: (...args: unknown[]) => mockDebtAggregate(...args),
    findMany: (...args: unknown[]) => mockDebtFindMany(...args),
  },
}));

jest.mock("@/entities/payment/api", () => ({
  paymentRepository: {
    count: (...args: unknown[]) => mockPaymentCount(...args),
    aggregate: (...args: unknown[]) => mockPaymentAggregate(...args),
    findMany: (...args: unknown[]) => mockPaymentFindMany(...args),
  },
}));

jest.mock("@/entities/settings/api", () => ({
  settingsRepository: {
    getDebtLimit: () => mockGetDebtLimit(),
    getOverdueDays: () => mockGetOverdueDays(),
  },
}));

function decimal(n: number) {
  return { toNumber: () => n };
}

describe("DebtorService", () => {
  const service = new DebtorService();

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe("getStats", () => {
    it("returns DebtorStats from repository aggregates", async () => {
      mockDebtorCount.mockResolvedValue(10);
      mockDebtorAggregate.mockResolvedValue({ _sum: { total_debt: decimal(5_000_000) } });
      mockDebtCount.mockResolvedValue(3);
      mockDebtAggregate.mockResolvedValue({ _sum: { amount: decimal(1_000_000) } });
      mockPaymentCount.mockResolvedValue(4);
      mockPaymentAggregate.mockResolvedValue({ _sum: { amount: decimal(2_000_000) } });

      const result = await service.getStats();

      expect(result).toEqual({
        totalDebtors: 10,
        totalDebt: 5_000_000,
        totalDebtsCount: 3,
        todayDebtsCount: 3,
        todayDebtsAmount: 1_000_000,
        todayPaymentsCount: 4,
        todayPaymentsAmount: 2_000_000,
      });
      expect(mockDebtorCount).toHaveBeenCalledWith({});
      expect(mockDebtCount).toHaveBeenCalled();
      expect(mockPaymentCount).toHaveBeenCalled();
    });

    it("handles zero aggregates", async () => {
      mockDebtorCount.mockResolvedValue(0);
      mockDebtorAggregate.mockResolvedValue({ _sum: { total_debt: null } });
      mockDebtCount.mockResolvedValue(0);
      mockDebtAggregate.mockResolvedValue({ _sum: { amount: null } });
      mockPaymentCount.mockResolvedValue(0);
      mockPaymentAggregate.mockResolvedValue({ _sum: { amount: null } });

      const result = await service.getStats();

      expect(result.totalDebtors).toBe(0);
      expect(result.totalDebt).toBe(0);
      expect(result.todayDebtsAmount).toBe(0);
      expect(result.todayPaymentsAmount).toBe(0);
    });
  });

  describe("getCustomerRatings", () => {
    it("returns paginated customer ratings from debt and payment repos", async () => {
      mockGetDebtLimit.mockResolvedValue(2_000_000);
      mockGetOverdueDays.mockResolvedValue(45);

      const created = new Date("2025-01-01");
      const debtorLike = {
        id: 1,
        external_id: "e1",
        first_name: "John",
        last_name: "Doe",
        phone_number: null,
        address: null,
        total_debt: decimal(1000),
        is_overdue: false,
        last_payment_date: null,
        created_at: created,
        updated_at: created,
        created_by: 1,
      };

      mockDebtFindMany.mockResolvedValue([
        {
          id: 1,
          debtor_id: 1,
          amount: decimal(1000),
          created_at: created,
          debtor: debtorLike,
        },
      ]);
      mockPaymentFindMany.mockResolvedValue([
        {
          id: 1,
          debtor_id: 1,
          amount: decimal(500),
          payment_type: "CASH",
          note: null,
          created_at: created,
          created_by: 1,
          debtor: debtorLike,
        },
      ]);

      const result = await service.getCustomerRatings({}, { page: 1, limit: 20 });

      expect(result.data).toHaveLength(1);
      expect(result.data[0].debtorId).toBe(1);
      expect(result.data[0].debtor.firstName).toBe("John");
      expect(result.data[0].debtor.lastName).toBe("Doe");
      expect(result.data[0].validPayments).toBe(1);
      expect(result.data[0].rating).toHaveProperty("score");
      expect(result.data[0].rating).toHaveProperty("label");
      expect(result.data[0].rating).toHaveProperty("color");
      expect(result.total).toBe(1);
      expect(result.page).toBe(1);
      expect(result.limit).toBe(20);
      expect(result.counts).toEqual({
        high: expect.any(Number),
        medium: expect.any(Number),
        critical: expect.any(Number),
      });
    });

    it("returns empty data when no debts", async () => {
      mockGetDebtLimit.mockResolvedValue(2_000_000);
      mockGetOverdueDays.mockResolvedValue(45);
      mockDebtFindMany.mockResolvedValue([]);
      mockPaymentFindMany.mockResolvedValue([]);

      const result = await service.getCustomerRatings();

      expect(result.data).toHaveLength(0);
      expect(result.total).toBe(0);
    });
  });
});
