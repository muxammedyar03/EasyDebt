import * as webPush from "web-push";
import { prisma } from "@/lib/prisma";
import { sendPushNotification, sendPushToUser } from "../push-service";

jest.mock("web-push", () => ({ setVapidDetails: jest.fn(), sendNotification: jest.fn() }));
jest.mock("@/lib/prisma", () => ({
  prisma: {
    userPushPreferences: { findUnique: jest.fn() },
    pushSubscription: { findMany: jest.fn(), deleteMany: jest.fn() },
  },
}));

const send = webPush.sendNotification as jest.Mock;
const deleteMany = prisma.pushSubscription.deleteMany as jest.Mock;
const subscription = { id: 14, user_id: 3, endpoint: "https://push.test", p256dh: "key", auth: "auth" };

beforeAll(() => {
  process.env.VAPID_PUBLIC_KEY = "test-public";
  process.env.VAPID_PRIVATE_KEY = "test-private";
});

beforeEach(() => {
  jest.clearAllMocks();
  (prisma.userPushPreferences.findUnique as jest.Mock).mockResolvedValue({ enabled: true, notification_types: [] });
  (prisma.pushSubscription.findMany as jest.Mock).mockResolvedValue([subscription]);
});

it.each([500, 429])("keeps the subscription after a transient %i error", async (statusCode) => {
  send.mockRejectedValue({ statusCode });
  expect(await sendPushToUser(9, 3, { title: "Reminder", message: "Due" })).toBe(0);
  expect(send).toHaveBeenCalledTimes(3);
  expect(deleteMany).not.toHaveBeenCalled();
  expect(prisma.pushSubscription.findMany).toHaveBeenCalledWith({
    where: { user_id: 3, user: { client_id: 9 } },
  });
});

it("removes an expired subscription only within its tenant", async () => {
  send.mockRejectedValue({ statusCode: 410 });
  expect(await sendPushToUser(9, 3, { title: "Reminder", message: "Due" })).toBe(0);
  expect(send).toHaveBeenCalledTimes(1);
  expect(deleteMany).toHaveBeenCalledWith({
    where: { id: { in: [14] }, user_id: 3, user: { client_id: 9 } },
  });
});

it("retains subscriptions when push times out", async () => {
  send.mockRejectedValue(new Error("timeout"));
  expect(await sendPushNotification(subscription, { title: "Reminder", message: "Due" })).toBe("retryable");
  expect(deleteMany).not.toHaveBeenCalled();
});
