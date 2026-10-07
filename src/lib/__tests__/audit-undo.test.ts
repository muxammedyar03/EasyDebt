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
const oldUser = { username: "old", email: null, role: "USER", first_name: null, last_name: null, is_active: true };
const newUser = { ...oldUser, username: "new" };
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
});
