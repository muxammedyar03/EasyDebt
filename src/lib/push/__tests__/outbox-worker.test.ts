import { prisma } from "@/lib/prisma";
import { sendPushNotification } from "../push-service";
import { processPushDeliveries } from "../outbox";

jest.mock("@/lib/prisma", () => ({
  prisma: {
    $queryRaw: jest.fn(),
    pushDelivery: { findFirst: jest.fn(), updateMany: jest.fn() },
    debtor: { findFirst: jest.fn() },
  },
}));
jest.mock("../push-service", () => ({ sendPushNotification: jest.fn() }));

const delivery = (id: number, clientId = 2) => ({
  id,
  client_id: clientId,
  attempts: 1,
  created_at: new Date(),
  notification: { id: 11, user_id: 3, debtor_id: null, type: "PAYMENT_REMINDER", title: "Reminder", message: "Due" },
  subscription: {
    id,
    user_id: 3,
    endpoint: `https://push.invalid/${id}`,
    p256dh: "key",
    auth: "auth",
    user: {
      client_id: 2,
      is_active: true,
      client: { is_active: true },
      user_push_preferences: { enabled: true, notification_types: ["PAYMENT_REMINDER"] },
    },
  },
});

beforeEach(() => jest.clearAllMocks());

it("records successful devices and delays transient failures independently", async () => {
  (prisma.$queryRaw as jest.Mock)
    .mockResolvedValueOnce([{ id: 1 }])
    .mockResolvedValueOnce([{ id: 2 }])
    .mockResolvedValue([]);
  (prisma.pushDelivery.findFirst as jest.Mock).mockResolvedValueOnce(delivery(1)).mockResolvedValueOnce(delivery(2));
  (sendPushNotification as jest.Mock).mockResolvedValueOnce("sent").mockResolvedValueOnce("retryable");
  expect(await processPushDeliveries()).toBe(2);
  expect(prisma.pushDelivery.updateMany).toHaveBeenCalledWith(
    expect.objectContaining({
      where: expect.objectContaining({ id: 1 }),
      data: expect.objectContaining({ status: "SENT" }),
    }),
  );
  expect(prisma.pushDelivery.updateMany).toHaveBeenCalledWith(
    expect.objectContaining({
      where: expect.objectContaining({ id: 2 }),
      data: expect.objectContaining({ status: "PENDING", available_at: expect.any(Date) }),
    }),
  );
  expect(sendPushNotification).toHaveBeenCalledTimes(2);
});

it("never sends a queued notification to a device owned by another shop", async () => {
  (prisma.$queryRaw as jest.Mock).mockResolvedValueOnce([{ id: 3 }]).mockResolvedValue([]);
  (prisma.pushDelivery.findFirst as jest.Mock).mockResolvedValue(delivery(3, 4));
  expect(await processPushDeliveries()).toBe(1);
  expect(sendPushNotification).not.toHaveBeenCalled();
  expect(prisma.pushDelivery.updateMany).toHaveBeenCalledWith(
    expect.objectContaining({
      data: expect.objectContaining({ status: "CANCELLED" }),
    }),
  );
});
