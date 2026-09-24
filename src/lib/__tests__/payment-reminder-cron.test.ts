import { checkPaymentReminders } from "../crons";
import { paymentReminderService } from "@/lib/services/payment-reminder.service";
import { prisma } from "@/lib/prisma";
import { sendPushForNotification } from "@/lib/push/push-service";

jest.mock("@/lib/services/payment-reminder.service", () => ({
  paymentReminderService: { findDueReminders: jest.fn() },
}));
jest.mock("@/lib/prisma", () => ({ prisma: { $transaction: jest.fn() } }));
jest.mock("@/lib/push/push-service", () => ({ sendPushForNotification: jest.fn() }));

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
  const create = jest.fn(async () => ({ id: 19 }));
  (prisma.$transaction as jest.Mock).mockImplementation((fn) =>
    fn({ paymentReminder: { updateMany }, notification: { create } }),
  );

  expect(await Promise.all([checkPaymentReminders(), checkPaymentReminders()])).toEqual([1, 0]);
  expect(updateMany).toHaveBeenCalledWith(
    expect.objectContaining({
      where: expect.objectContaining({ id: 8, client_id: 2, status: "PENDING" }),
    }),
  );
  expect(create).toHaveBeenCalledTimes(1);
  expect(create).toHaveBeenCalledWith(
    expect.objectContaining({
      data: expect.objectContaining({ client_id: 2, user_id: 3, debtor_id: 4 }),
    }),
  );
  expect(sendPushForNotification).toHaveBeenCalledTimes(1);
});

it("does not claim success when the notification insert fails", async () => {
  (prisma.$transaction as jest.Mock).mockRejectedValue(new Error("database write failed"));
  expect(await checkPaymentReminders()).toBe(0);
  expect(sendPushForNotification).not.toHaveBeenCalled();
});
