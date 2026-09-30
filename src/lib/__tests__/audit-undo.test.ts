import type { AuditLog } from "@prisma/client";
import { canUndoAuditLog, undoAuditAction, AuditUndoError, UNDO_WINDOW_MS } from "../audit-undo";

jest.mock("@/lib/prisma", () => ({ prisma: {} }));
let mockTx: Record<string, unknown>;
jest.mock("@/lib/security/serializable", () => ({
  serializableTransaction: (work: (tx: unknown) => Promise<unknown>) => work(mockTx),
}));

const now = new Date("2026-09-30T10:00:00.000Z");
const oldFields = { first_name: "Old", last_name: "Name", phone_number: null, address: null };
const newFields = { ...oldFields, first_name: "New" };
function log(overrides: Partial<AuditLog> = {}): AuditLog {
  return {
    id: 51, client_id: 4, user_id: 9, action: "UPDATE", entity_type: "DEBTOR", entity_id: 31,
    old_value: oldFields, new_value: newFields, created_at: new Date(now.getTime() - 1000),
    description: null, ip_address: null, user_agent: null, ...overrides,
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
    mockTx = {
      auditLog: { findFirst: jest.fn((query) => query.where.id ? findLog(query) : findUndo(query)), create: createAudit },
      debtor: { findFirst: findDebtor, update, delete: remove },
      debt: { count: debtCount }, payment: { count: paymentCount },
      paymentReminder: { count: reminderCount }, $queryRaw: locked,
    };
  });

  it("restores old fields in the same transaction and logs the undo", async () => {
    await expect(undoAuditAction(4, 11, 51, now)).resolves.toEqual({ id: 52 });
    expect(findLog).toHaveBeenCalledWith({ where: { id: 51, client_id: 4 } });
    expect(update).toHaveBeenCalledWith({ where: { id: 31, client_id: 4 }, data: oldFields });
    expect(createAudit).toHaveBeenCalledWith({ data: expect.objectContaining({
      client_id: 4, user_id: 11, action: "UNDO", entity_type: "AUDIT_LOG", entity_id: 51,
    }) });
  });

  it("refuses a second undo or a changed record", async () => {
    findUndo.mockResolvedValueOnce({ id: 99 });
    await expect(undoAuditAction(4, 11, 51, now)).rejects.toThrow(AuditUndoError);
    findDebtor.mockResolvedValueOnce({ ...newFields, first_name: "Other", total_debt: { toNumber: () => 0 } });
    await expect(undoAuditAction(4, 11, 51, now)).rejects.toThrow(/keyin o‘zgargan/);
    expect(update).not.toHaveBeenCalled();
  });

  it("never removes a debtor with financial history", async () => {
    findLog.mockResolvedValueOnce(log({ action: "CREATE", old_value: null }));
    debtCount.mockResolvedValueOnce(1);
    await expect(undoAuditAction(4, 11, 51, now)).rejects.toThrow(/qarz, to‘lov/);
    expect(remove).not.toHaveBeenCalled();
  });

  it("does not search outside the requested tenant", async () => {
    findLog.mockResolvedValueOnce(null);
    await expect(undoAuditAction(8, 11, 51, now)).rejects.toMatchObject({ status: 404 });
    expect(update).not.toHaveBeenCalled();
  });
});
