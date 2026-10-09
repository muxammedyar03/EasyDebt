import { Prisma, type AuditLog } from "@prisma/client";
import { AuditUndoError, UNDO_WINDOW_MS } from "../audit-undo";
import { canCancelAuditLog, cancelAuditAction } from "../audit-cancel";

jest.mock("@/lib/prisma", () => ({ prisma: {} }));
let mockTx: Record<string, unknown>;
jest.mock("@/lib/security/serializable", () => ({
  serializableTransaction: (work: (tx: unknown) => Promise<unknown>) => work(mockTx),
}));
jest.mock("@/lib/security/refresh-debtor-status", () => ({ refreshDebtorStatus: jest.fn().mockResolvedValue({}) }));
jest.mock("@/lib/services/company-daily-snapshot.service", () => ({
  companyDailySnapshotService: { refreshAffectedDates: jest.fn().mockResolvedValue(undefined) },
}));

const now = new Date("2026-09-30T10:00:00Z");
const debtLog = {
  id: 41,
  client_id: 4,
  user_id: 11,
  action: "DEBT_ADDED",
  entity_type: "DEBT",
  entity_id: 7,
  old_value: null,
  new_value: { debtor_id: 3, amount: "100.00" },
  description: "Qarz qo‘shildi",
  ip_address: null,
  user_agent: null,
  created_at: new Date(now.getTime() - 1000),
} as AuditLog;
const paymentLog = {
  ...debtLog,
  id: 42,
  action: "UPDATE",
  entity_type: "PAYMENT",
  entity_id: 8,
  new_value: { debtor_id: 3, amount: 100, payment_type: "CASH", previousBalance: 100, newBalance: 0 },
} as AuditLog;
const companyDebtLog = {
  ...debtLog,
  id: 43,
  action: "CREATE",
  entity_type: "COMPANY_DEBT",
  entity_id: 9,
  new_value: { company_id: 6, amount: "100.00" },
} as AuditLog;
const companyPaymentLog = {
  ...companyDebtLog,
  id: 44,
  entity_type: "COMPANY_PAYMENT",
  entity_id: 10,
  new_value: { company_id: 6, amount: "100.00", payment_type: "CARD" },
} as AuditLog;

describe("financial cancellation", () => {
  it("offers only recent, fully recognizable creation audit entries", () => {
    expect(canCancelAuditLog(debtLog, now)).toBe(true);
    expect(canCancelAuditLog(paymentLog, now)).toBe(true);
    expect(canCancelAuditLog(companyDebtLog, now)).toBe(true);
    expect(canCancelAuditLog(companyPaymentLog, now)).toBe(true);
    expect(canCancelAuditLog({ ...debtLog, action: "DEBT_UPDATED" }, now)).toBe(false);
    expect(canCancelAuditLog({ ...paymentLog, old_value: { amount: 10 } }, now)).toBe(false);
    expect(canCancelAuditLog({ ...debtLog, created_at: new Date(now.getTime() - UNDO_WINDOW_MS - 1) }, now)).toBe(
      false,
    );
  });

  const findAudit = jest.fn();
  const findPrior = jest.fn();
  const findLater = jest.fn();
  const locked = jest.fn();
  const findDebtor = jest.fn();
  const findDebt = jest.fn();
  const findPayment = jest.fn();
  const createDebt = jest.fn();
  const createPayment = jest.fn();
  const updateDebtor = jest.fn();
  const createAudit = jest.fn();
  const findCompany = jest.fn();
  const updateCompany = jest.fn();
  const findCompanyDebt = jest.fn();
  const createCompanyDebt = jest.fn();
  const findCompanyPayment = jest.fn();
  const createCompanyPayment = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();
    findAudit.mockResolvedValue(debtLog);
    findPrior.mockResolvedValue(null);
    findLater.mockResolvedValue(null);
    locked.mockResolvedValue([{ id: 3 }]);
    findDebtor.mockResolvedValue({ id: 3, external_id: "debtor-id" });
    findDebt.mockResolvedValue({
      id: 7,
      debtor_id: 3,
      created_by: 11,
      amount: new Prisma.Decimal(100),
      reverses_debt_id: null,
    });
    findPayment.mockResolvedValue({
      id: 8,
      debtor_id: 3,
      created_by: 11,
      amount: new Prisma.Decimal(100),
      payment_type: "CASH",
      reverses_payment_id: null,
    });
    createDebt.mockResolvedValue({ id: 101 });
    createPayment.mockResolvedValue({ id: 102 });
    findCompany.mockResolvedValue({ id: 6, external_id: "company-id" });
    findCompanyDebt.mockResolvedValue({
      id: 9,
      company_id: 6,
      created_by: 11,
      amount: new Prisma.Decimal(100),
      reverses_company_debt_id: null,
    });
    createCompanyDebt.mockResolvedValue({ id: 103, created_at: now });
    findCompanyPayment.mockResolvedValue({
      id: 10,
      company_id: 6,
      created_by: 11,
      amount: new Prisma.Decimal(100),
      payment_type: "CARD",
      reverses_company_payment_id: null,
    });
    createCompanyPayment.mockResolvedValue({ id: 104, created_at: now });
    createAudit.mockResolvedValue({ id: 55 });
    mockTx = {
      auditLog: {
        findFirst: jest.fn((query) =>
          query.where.id ? findAudit(query) : query.where.action === "CANCEL" ? findPrior(query) : findLater(query),
        ),
        create: createAudit,
      },
      debtor: { findFirstOrThrow: findDebtor, update: updateDebtor },
      debt: { findFirst: findDebt, create: createDebt },
      payment: { findFirst: findPayment, create: createPayment },
      company: { findFirstOrThrow: findCompany, update: updateCompany },
      companyDebt: { findFirst: findCompanyDebt, create: createCompanyDebt },
      companyPayment: { findFirst: findCompanyPayment, create: createCompanyPayment },
      $queryRaw: locked,
    };
  });

  it("posts a negative debt, updates the same tenant balance and audits the reason", async () => {
    const result = await cancelAuditAction(4, 99, 41, "Xato kiritilgan", now);
    expect(result).toEqual({ audit: { id: 55 }, debtorExternalId: "debtor-id" });
    expect(findAudit).toHaveBeenCalledWith({ where: { id: 41, client_id: 4 } });
    expect(createDebt).toHaveBeenCalledWith({
      data: expect.objectContaining({
        client_id: 4,
        debtor_id: 3,
        reverses_debt_id: 7,
        created_by: 99,
        amount: new Prisma.Decimal(-100),
      }),
    });
    expect(updateDebtor).toHaveBeenCalledWith({
      where: { id: 3, client_id: 4 },
      data: { total_debt: { decrement: new Prisma.Decimal(100) } },
    });
    expect(createAudit).toHaveBeenCalledWith({
      data: expect.objectContaining({
        action: "CANCEL",
        entity_type: "AUDIT_LOG",
        entity_id: 41,
        new_value: { reversal_id: 101, debtor_id: 3, reason: "Xato kiritilgan" },
      }),
    });
  });

  it("posts a negative payment without resetting rating", async () => {
    findAudit.mockResolvedValue(paymentLog);
    await cancelAuditAction(4, 99, 42, "Noto‘g‘ri to‘lov", now);
    expect(createPayment).toHaveBeenCalledWith({
      data: expect.objectContaining({
        client_id: 4,
        debtor_id: 3,
        reverses_payment_id: 8,
        amount: new Prisma.Decimal(-100),
        resets_rating: false,
      }),
    });
    expect(updateDebtor).toHaveBeenCalledWith({
      where: { id: 3, client_id: 4 },
      data: { total_debt: { increment: new Prisma.Decimal(100) } },
    });
  });

  it("rejects duplicate, edited and cross-tenant actions without financial mutation", async () => {
    findPrior.mockResolvedValueOnce({ id: 60 });
    await expect(cancelAuditAction(4, 99, 41, "Xato kiritilgan", now)).rejects.toThrow(AuditUndoError);
    findLater.mockResolvedValueOnce({ id: 70 });
    await expect(cancelAuditAction(4, 99, 41, "Xato kiritilgan", now)).rejects.toThrow(/keyin o‘zgartirilgan/);
    findAudit.mockResolvedValueOnce(null);
    await expect(cancelAuditAction(5, 99, 41, "Xato kiritilgan", now)).rejects.toMatchObject({ status: 404 });
    expect(createDebt).not.toHaveBeenCalled();
  });

  it("posts company debt and payment reversals and restores the company balance", async () => {
    findAudit.mockResolvedValueOnce(companyDebtLog);
    await expect(cancelAuditAction(4, 99, 43, "Xato kiritilgan", now)).resolves.toEqual({
      audit: { id: 55 },
      companyExternalId: "company-id",
    });
    expect(createCompanyDebt).toHaveBeenCalledWith({
      data: expect.objectContaining({
        company_id: 6,
        amount: new Prisma.Decimal(-100),
        reverses_company_debt_id: 9,
      }),
    });
    expect(updateCompany).toHaveBeenLastCalledWith({
      where: { id: 6, client_id: 4 },
      data: { total_debt: { decrement: new Prisma.Decimal(100) } },
    });

    findAudit.mockResolvedValueOnce(companyPaymentLog);
    await cancelAuditAction(4, 99, 44, "Noto‘g‘ri to‘lov", now);
    expect(createCompanyPayment).toHaveBeenCalledWith({
      data: expect.objectContaining({
        company_id: 6,
        amount: new Prisma.Decimal(-100),
        payment_type: "CARD",
        reverses_company_payment_id: 10,
      }),
    });
    expect(updateCompany).toHaveBeenLastCalledWith({
      where: { id: 6, client_id: 4 },
      data: { total_debt: { increment: new Prisma.Decimal(100) } },
    });
  });
});
