/**
 * debtor.mapper tests: Prisma-like object → domain object (prismaToDomainDebtor, prismaToDomainDebt, prismaToDomainPayment).
 */
import {
  prismaToDomainDebtor,
  prismaToDomainDebt,
  prismaToDomainPayment,
  domainToTableViewDebtor,
  domainToDetailViewDebtor,
} from "../debtor.mapper";

function decimal(n: number) {
  return { toNumber: () => n };
}

describe("prismaToDomainDebt", () => {
  it("maps Prisma debt to DebtDomain", () => {
    const prismaDebt = {
      id: 1,
      external_id: "d1",
      debtor_id: 10,
      amount: decimal(50_000),
      description: "Goods",
      items: null,
      created_at: new Date("2025-03-01"),
      created_by: 1,
    };
    const result = prismaToDomainDebt(prismaDebt as never);
    expect(result).toEqual({
      id: 1,
      externalId: "d1",
      debtorId: 10,
      amount: 50_000,
      description: "Goods",
      items: null,
      createdAt: prismaDebt.created_at,
      createdBy: 1,
    });
  });
});

describe("prismaToDomainPayment", () => {
  it("maps Prisma payment to PaymentDomain", () => {
    const prismaPayment = {
      id: 1,
      external_id: "p1",
      debtor_id: 10,
      amount: decimal(25_000),
      payment_type: "CASH",
      note: "Partial",
      created_at: new Date("2025-03-02"),
      created_by: 1,
    };
    const result = prismaToDomainPayment(prismaPayment as never);
    expect(result).toEqual({
      id: 1,
      externalId: "p1",
      debtorId: 10,
      amount: 25_000,
      paymentType: "CASH",
      note: "Partial",
      createdAt: prismaPayment.created_at,
      createdBy: 1,
    });
  });
});

describe("prismaToDomainDebtor", () => {
  const basePrismaDebtor = {
    id: 1,
    external_id: "e1",
    first_name: "John",
    last_name: "Doe",
    phone_number: "+998901234567",
    address: "Toshkent",
    total_debt: decimal(100_000),
    is_overdue: false,
    last_payment_date: null as Date | null,
    created_at: new Date("2025-01-01"),
    updated_at: new Date("2025-01-02"),
    created_by: 1,
  };

  it("maps Prisma debtor to DebtorDomain with defaults", () => {
    const result = prismaToDomainDebtor(basePrismaDebtor as never);
    expect(result.id).toBe(1);
    expect(result.externalId).toBe("e1");
    expect(result.firstName).toBe("John");
    expect(result.lastName).toBe("Doe");
    expect(result.phoneNumber).toBe("+998901234567");
    expect(result.address).toBe("Toshkent");
    expect(result.totalDebt).toBe(100_000);
    expect(result.isOverdue).toBe(false);
    expect(result.lastPaymentDate).toBeNull();
    expect(result.createdAt).toEqual(basePrismaDebtor.created_at);
    expect(result.updatedAt).toEqual(basePrismaDebtor.updated_at);
    expect(result.createdBy).toBe(1);
    expect(["low", "medium", "high", "critical"]).toContain(result.riskStatus);
    expect(["active", "overdue", "paid_off", "inactive"]).toContain(result.status);
  });

  it("uses options debtLimit and overdueDays", () => {
    const result = prismaToDomainDebtor(basePrismaDebtor as never, {
      debtLimit: 50_000,
      overdueDays: 30,
    });
    expect(result.totalDebt).toBe(100_000);
    expect(result.riskStatus).toBeDefined();
  });

  it("maps debts and payments when present", () => {
    const debt = {
      id: 1,
      external_id: "d1",
      debtor_id: 1,
      amount: decimal(50_000),
      description: null,
      items: null,
      created_at: new Date("2025-03-01"),
      created_by: 1,
    };
    const payment = {
      id: 1,
      external_id: "p1",
      debtor_id: 1,
      amount: decimal(25_000),
      payment_type: "CASH",
      note: null,
      created_at: new Date("2025-03-02"),
      created_by: 1,
    };
    const debtorWithRelations = {
      ...basePrismaDebtor,
      debts: [debt],
      payments: [payment],
    };
    const result = prismaToDomainDebtor(debtorWithRelations as never);
    expect(result.debts).toHaveLength(1);
    expect(result.debts![0].amount).toBe(50_000);
    expect(result.payments).toHaveLength(1);
    expect(result.payments![0].amount).toBe(25_000);
  });

  it("maps creator when present", () => {
    const withCreator = {
      ...basePrismaDebtor,
      creator: {
        id: 1,
        username: "admin",
        first_name: "Admin",
        last_name: "User",
      },
    };
    const result = prismaToDomainDebtor(withCreator as never);
    expect(result.creator).toEqual({
      id: 1,
      username: "admin",
      firstName: "Admin",
      lastName: "User",
    });
  });
});

describe("domainToTableViewDebtor", () => {
  const domainDebtor = {
    id: 1,
    externalId: "e1",
    firstName: "John",
    lastName: "Doe",
    phoneNumber: null as string | null,
    address: null as string | null,
    totalDebt: 100_000,
    isOverdue: false,
    lastPaymentDate: null as Date | null,
    riskStatus: "low" as const,
    status: "active" as const,
    daysOverdue: null as number | null,
    createdAt: new Date("2025-01-01"),
    updatedAt: new Date("2025-01-01"),
    createdBy: 1,
  };

  it("maps domain to table view with required display fields", () => {
    const result = domainToTableViewDebtor(domainDebtor as never);
    expect(result.id).toBe(1);
    expect(result.externalId).toBe("e1");
    expect(result.fullName).toBe("John Doe");
    expect(result.totalDebtFormatted).toBeDefined();
    expect(result.riskStatusBadge).toBeDefined();
    expect(result.statusBadge).toBeDefined();
  });
});

describe("domainToDetailViewDebtor", () => {
  const domainDebtor = {
    id: 1,
    externalId: "e1",
    firstName: "Jane",
    lastName: "Smith",
    phoneNumber: null as string | null,
    address: null as string | null,
    totalDebt: 50_000,
    isOverdue: false,
    lastPaymentDate: null as Date | null,
    riskStatus: "low" as const,
    status: "active" as const,
    daysOverdue: null as number | null,
    createdAt: new Date("2025-01-01"),
    updatedAt: new Date("2025-01-01"),
    createdBy: 1,
    debts: [
      {
        id: 1,
        externalId: "d1",
        debtorId: 1,
        amount: 50_000,
        description: null,
        items: null,
        createdAt: new Date("2025-03-01"),
        createdBy: 1,
      },
    ],
    payments: [],
  };

  it("maps domain to detail view with debts and payments", () => {
    const result = domainToDetailViewDebtor(domainDebtor as never);
    expect(result.fullName).toBe("Jane Smith");
    expect(result.debts).toHaveLength(1);
    expect(result.debts[0].amount).toBe(50_000);
    expect(result.debts[0].amountFormatted).toBeDefined();
    expect(result.payments).toHaveLength(0);
  });
});
