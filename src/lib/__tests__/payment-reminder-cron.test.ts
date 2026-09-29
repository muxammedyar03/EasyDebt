import { checkPaymentReminders } from "../crons";
import { paymentReminderService } from "@/lib/services/payment-reminder.service";
import { prisma } from "@/lib/prisma";
import { createNotificationInTransaction } from "@/lib/notifications";

jest.mock("@/lib/services/payment-reminder.service", () => ({
  paymentReminderService: { findDueReminders: jest.fn() },
}));
jest.mock("@/lib/prisma", () => ({ prisma: { $transaction: jest.fn() } }));
jest.mock("@/lib/notifications", () => ({ createNotificationInTransaction: jest.fn() }));

const due = {
  id: 8,
  clientId: 2,
  createdBy: 3,
  debtorId: 4,
  reminderAt: new Date("2026-01-01T00:00:00Z"),
  note: null,
  debtor: { firstName: "Ali", lastName: "Valiyev", externalId: "ref-4" },
};

beforeEach(() => {
  jest.clearAllMocks();
  (paymentReminderService.findDueReminders as jest.Mock).mockResolvedValue([due]);
});

it("creates one reminder notification for two concurrent workers", async () => {
  let pending = true;
  const updateMany = jest.fn(async () => {
    if (!pending) return { count: 0 };
    pending = false;
    return { count: 1 };
  });
  (createNotificationInTransaction as jest.Mock).mockResolvedValue({ id: 19 });
  (prisma.$transaction as jest.Mock).mockImplementation((fn) => fn({ paymentReminder: { updateMany } }));

  expect(await Promise.all([checkPaymentReminders(), checkPaymentReminders()])).toEqual([1, 0]);
  expect(updateMany).toHaveBeenCalledWith(
    expect.objectContaining({
      where: expect.objectContaining({ id: 8, client_id: 2, status: "PENDING" }),
    }),
  );
  expect(createNotificationInTransaction).toHaveBeenCalledTimes(1);
  expect(createNotificationInTransaction).toHaveBeenCalledWith(
    expect.anything(),
    expect.objectContaining({ clientId: 2, userId: 3, debtorId: 4 }),
  );
});

it("does not claim success when the notification insert fails", async () => {
  (prisma.$transaction as jest.Mock).mockRejectedValue(new Error("database write failed"));
  expect(await checkPaymentReminders()).toBe(0);
  expect(createNotificationInTransaction).not.toHaveBeenCalled();
});
