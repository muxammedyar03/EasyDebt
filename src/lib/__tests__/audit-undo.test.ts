import { Prisma, type AuditLog } from "@prisma/client";
import { canUndoAuditLog, undoAuditAction, AuditUndoError, UNDO_WINDOW_MS } from "../audit-undo";

jest.mock("@/lib/prisma", () => ({ prisma: {} }));
let mockTx: Record<string, unknown>;
jest.mock("@/lib/security/serializable", () => ({
  serializableTransaction: (work: (tx: unknown) => Promise<unknown>) => work(mockTx),
}));
jest.mock("@/lib/services/company-daily-snapshot.service", () => ({
  companyDailySnapshotService: { refreshAffectedDates: jest.fn().mockResolvedValue(undefined) },
}));

const now = new Date("2026-09-30T10:00:00.000Z");
const oldFields = { first_name: "Old", last_name: "Name", phone_number: null, address: null };
const newFields = { ...oldFields, first_name: "New" };
const oldUser = { username: "old", email: null, role: "USER", first_name: null, last_name: null, is_active: true };
const newUser = { ...oldUser, username: "new" };
const oldCompany = { name: "Old company", contact_person: null, phone_number: null, address: null };
const newCompany = { ...oldCompany, name: "New company" };
const oldCompanyDebt = { company_id: 8, amount: "100", note: null, items: null };
const newCompanyDebt = { ...oldCompanyDebt, amount: "150" };
const oldCompanyPayment = { company_id: 8, amount: "80", payment_type: "CASH", note: null };
const newCompanyPayment = { ...oldCompanyPayment, amount: "120", payment_type: "CARD" };
function log(overrides: Partial<AuditLog> = {}): AuditLog {
  return {
    id: 51,
    client_id: 4,
    user_id: 9,
    action: "UPDATE",
    entity_type: "DEBTOR",
    entity_id: 31,
    old_value: oldFields,
    new_value: newFields,
    created_at: new Date(now.getTime() - 1000),
    description: null,
    ip_address: null,
    user_agent: null,
    ...overrides,
  };
}

describe("audit undo policy", () => {
  it("allows only recent actions with a complete inverse", () => {
    expect(canUndoAuditLog(log(), now)).toBe(true);
    expect(canUndoAuditLog(log({ action: "CREATE", old_value: null }), now)).toBe(true);
    expect(canUndoAuditLog(log({ action: "PAYMENT_ADDED", entity_type: "PAYMENT" }), now)).toBe(false);
    expect(canUndoAuditLog(log({ old_value: null }), now)).toBe(false);
    expect(canUndoAuditLog(log({ created_at: new Date(now.getTime() - UNDO_WINDOW_MS - 1) }), now)).toBe(false);
    expect(canUndoAuditLog(log({ created_at: new Date(now.getTime() + 1000) }), now)).toBe(false);
    expect(canUndoAuditLog(log({ entity_type: "USER", old_value: oldUser, new_value: newUser }), now)).toBe(true);
    expect(
      canUndoAuditLog(
        log({ entity_type: "USER", old_value: oldUser, new_value: { ...newUser, security_changed: true } }),
        now,
      ),
    ).toBe(false);
    expect(
      canUndoAuditLog(log({ entity_type: "COMPANY", action: "CREATE", old_value: null, new_value: newCompany }), now),
    ).toBe(true);
    expect(
      canUndoAuditLog(log({ entity_type: "COMPANY_DEBT", old_value: oldCompanyDebt, new_value: newCompanyDebt }), now),
    ).toBe(true);
    expect(
      canUndoAuditLog(
        log({ entity_type: "COMPANY_DEBT", old_value: { amount: "100" }, new_value: { amount: "150" } }),
        now,
      ),
    ).toBe(false);
    expect(
      canUndoAuditLog(
        log({ entity_type: "COMPANY_PAYMENT", old_value: oldCompanyPayment, new_value: newCompanyPayment }),
        now,
      ),
    ).toBe(true);
  });
});

describe("undo transaction", () => {
  const findLog = jest.fn();
  const findDebtor = jest.fn();
  const findUndo = jest.fn();
  const locked = jest.fn();
  const update = jest.fn();
  const remove = jest.fn();
  const createAudit = jest.fn();
  const debtCount = jest.fn();
  const paymentCount = jest.fn();
  const reminderCount = jest.fn();
  const findUser = jest.fn();
  const updateUser = jest.fn();
  const removeUser = jest.fn();
  const overridesCount = jest.fn();
  const findCompany = jest.fn();
  const updateCompany = jest.fn();
  const removeCompany = jest.fn();
  const companyDebtCount = jest.fn();
  const companyPaymentCount = jest.fn();
  const findCompanyDebt = jest.fn();
  const updateCompanyDebt = jest.fn();
  const findCompanyPayment = jest.fn();
  const updateCompanyPayment = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();
    findLog.mockResolvedValue(log());
    findUndo.mockResolvedValue(null);
    locked.mockResolvedValue([{ id: 31 }]);
    findDebtor.mockResolvedValue({ id: 31, client_id: 4, ...newFields, total_debt: { toNumber: () => 0 } });
    debtCount.mockResolvedValue(0);
    paymentCount.mockResolvedValue(0);
    reminderCount.mockResolvedValue(0);
    createAudit.mockResolvedValue({ id: 52 });
    findUser.mockResolvedValue({ id: 31, client_id: 4, ...newUser });
    findCompany.mockResolvedValue({ id: 31, client_id: 4, ...newCompany, total_debt: new Prisma.Decimal(0) });
    companyDebtCount.mockResolvedValue(0);
    companyPaymentCount.mockResolvedValue(0);
    findCompanyDebt.mockResolvedValue({
      id: 31,
      client_id: 4,
      company_id: 8,
      amount: new Prisma.Decimal(150),
      note: null,
      items: null,
      created_at: now,
    });
    findCompanyPayment.mockResolvedValue({
      id: 32,
      client_id: 4,
      company_id: 8,
      amount: new Prisma.Decimal(120),
      payment_type: "CARD",
      note: null,
      created_at: now,
    });
    overridesCount.mockResolvedValue(0);
    mockTx = {
      auditLog: {
        findFirst: jest.fn((query) => (query.where.id ? findLog(query) : findUndo(query))),
        create: createAudit,
      },
      debtor: { findFirst: findDebtor, update, delete: remove },
      debt: { count: debtCount },
      payment: { count: paymentCount },
      paymentReminder: { count: reminderCount },
      $queryRaw: locked,
      user: { findFirst: findUser, update: updateUser, delete: removeUser },
      userPermission: { count: overridesCount },
      company: { findFirst: findCompany, update: updateCompany, delete: removeCompany },
      companyDebt: { count: companyDebtCount, findFirst: findCompanyDebt, update: updateCompanyDebt },
      companyPayment: {
        count: companyPaymentCount,
        findFirst: findCompanyPayment,
        update: updateCompanyPayment,
      },
    };
  });

  it("restores old fields in the same transaction and logs the undo", async () => {
    await expect(undoAuditAction(4, 11, 51, "ADMIN", now)).resolves.toEqual({ id: 52 });
    expect(findLog).toHaveBeenCalledWith({ where: { id: 51, client_id: 4 } });
    expect(update).toHaveBeenCalledWith({ where: { id: 31, client_id: 4 }, data: oldFields });
    expect(createAudit).toHaveBeenCalledWith({
      data: expect.objectContaining({
        client_id: 4,
        user_id: 11,
        action: "UNDO",
        entity_type: "AUDIT_LOG",
        entity_id: 51,
      }),
    });
  });

  it("refuses a second undo or a changed record", async () => {
    findUndo.mockResolvedValueOnce({ id: 99 });
    await expect(undoAuditAction(4, 11, 51, "ADMIN", now)).rejects.toThrow(AuditUndoError);
    findDebtor.mockResolvedValueOnce({ ...newFields, first_name: "Other", total_debt: { toNumber: () => 0 } });
    await expect(undoAuditAction(4, 11, 51, "ADMIN", now)).rejects.toThrow(/keyin o‘zgargan/);
    expect(update).not.toHaveBeenCalled();
  });

  it("never removes a debtor with financial history", async () => {
    findLog.mockResolvedValueOnce(log({ action: "CREATE", old_value: null }));
    debtCount.mockResolvedValueOnce(1);
    await expect(undoAuditAction(4, 11, 51, "ADMIN", now)).rejects.toThrow(/qarz, to‘lov/);
    expect(remove).not.toHaveBeenCalled();
  });

  it("does not search outside the requested tenant", async () => {
    findLog.mockResolvedValueOnce(null);
    await expect(undoAuditAction(8, 11, 51, "ADMIN", now)).rejects.toMatchObject({ status: 404 });
    expect(update).not.toHaveBeenCalled();
  });

  it("requires superadmin for user undo and restores only non-secret fields", async () => {
    findLog.mockResolvedValue(log({ entity_type: "USER", old_value: oldUser, new_value: newUser }));
    await expect(undoAuditAction(4, 11, 51, "ADMIN", now)).rejects.toMatchObject({ status: 403 });
    await expect(undoAuditAction(4, 11, 51, "SUPER_ADMIN", now)).resolves.toEqual({ id: 52 });
    expect(updateUser).toHaveBeenCalledWith({ where: { id: 31, client_id: 4 }, data: oldUser });
    expect(JSON.stringify(createAudit.mock.calls[0][0])).not.toMatch(/password|pin/i);
  });

  it("does not delete a created user after permissions are assigned", async () => {
    findLog.mockResolvedValue(log({ entity_type: "USER", action: "CREATE", old_value: null, new_value: newUser }));
    overridesCount.mockResolvedValue(1);
    await expect(undoAuditAction(4, 11, 51, "SUPER_ADMIN", now)).rejects.toThrow(/ruxsatlar/);
    expect(removeUser).not.toHaveBeenCalled();
  });

  it("restores company fields and a company debt balance", async () => {
    findLog.mockResolvedValueOnce(
      log({ entity_type: "COMPANY", old_value: oldCompany, new_value: newCompany, entity_id: 31 }),
    );
    await undoAuditAction(4, 11, 51, "ADMIN", now);
    expect(updateCompany).toHaveBeenCalledWith({ where: { id: 31, client_id: 4 }, data: oldCompany });

    findLog.mockResolvedValueOnce(
      log({ entity_type: "COMPANY_DEBT", old_value: oldCompanyDebt, new_value: newCompanyDebt, entity_id: 31 }),
    );
    await undoAuditAction(4, 11, 51, "ADMIN", now);
    expect(updateCompanyDebt).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { id: 31, client_id: 4 },
        data: expect.objectContaining({ amount: "100" }),
      }),
    );
    expect(updateCompany).toHaveBeenLastCalledWith({
      where: { id: 8, client_id: 4 },
      data: { total_debt: { increment: new Prisma.Decimal(-50) } },
    });

    findLog.mockResolvedValueOnce(
      log({
        entity_type: "COMPANY_PAYMENT",
        old_value: oldCompanyPayment,
        new_value: newCompanyPayment,
        entity_id: 32,
      }),
    );
    await undoAuditAction(4, 11, 51, "ADMIN", now);
    expect(updateCompanyPayment).toHaveBeenCalledWith({
      where: { id: 32, client_id: 4 },
      data: { amount: "80", payment_type: "CASH", note: null },
    });
    expect(updateCompany).toHaveBeenLastCalledWith({
      where: { id: 8, client_id: 4 },
      data: { total_debt: { increment: new Prisma.Decimal(40) } },
    });
  });
});
