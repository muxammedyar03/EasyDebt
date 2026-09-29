import { randomUUID } from "crypto";
import { Prisma, type Notification } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { sendPushNotification } from "./push-service";

const MAX_ATTEMPTS = 8;
const LEASE_SECONDS = 120;

export async function enqueueNotificationPush(tx: Prisma.TransactionClient, notification: Notification) {
  if (!notification.user_id) return;
  const preferences = await tx.userPushPreferences.findUnique({ where: { user_id: notification.user_id } });
  if (
    !preferences?.enabled ||
    !Array.isArray(preferences.notification_types) ||
    !preferences.notification_types.includes(notification.type)
  )
    return;
  const subscriptions = await tx.pushSubscription.findMany({
    where: { user_id: notification.user_id, user: { client_id: notification.client_id, is_active: true } },
    select: { id: true },
  });
  if (!subscriptions.length) return;
  await tx.pushDelivery.createMany({
    data: subscriptions.map((subscription) => ({
      client_id: notification.client_id,
      notification_id: notification.id,
      subscription_id: subscription.id,
    })),
    skipDuplicates: true,
  });
}

// One atomic statement claims one delivery. Expired leases recover crashed workers.
export function claimDeliveryQuery(token: string) {
  return Prisma.sql`UPDATE push_deliveries SET lease_token=${token}::uuid,
    locked_until=NOW() + ${LEASE_SECONDS} * INTERVAL '1 second', attempts=attempts+1
    WHERE id=(SELECT id FROM push_deliveries
      WHERE status='PENDING' AND available_at<=NOW()
        AND (locked_until IS NULL OR locked_until<NOW())
      ORDER BY available_at, id FOR UPDATE SKIP LOCKED LIMIT 1)
    RETURNING id`;
}

export function retryAt(attempts: number, now = Date.now()) {
  return new Date(now + Math.min(3600, 30 * 2 ** Math.max(0, attempts - 1)) * 1000);
}

/** Each request has a bounded work budget; multiple callers can safely drain together. */
export async function processPushDeliveries(limit = 20) {
  const deadline = Date.now() + 30000;
  let processed = 0;
  while (processed < limit && Date.now() < deadline) {
    const token = randomUUID();
    const claimed = await prisma.$queryRaw<Array<{ id: number }>>(claimDeliveryQuery(token));
    if (!claimed.length) break;
    const id = claimed[0].id;
    const where = { id, lease_token: token, status: "PENDING" };
    const delivery = await prisma.pushDelivery.findFirst({
      where,
      include: {
        notification: true,
        subscription: {
          include: {
            user: {
              include: {
                user_push_preferences: true,
                client: true,
              },
            },
          },
        },
      },
    });
    if (!delivery) continue;
    processed++;
    const finish = (status: string, lastError: string | null = null) =>
      prisma.pushDelivery.updateMany({
        where,
        data: {
          status,
          last_error: lastError,
          lease_token: null,
          locked_until: null,
          ...(status === "SENT" ? { sent_at: new Date() } : {}),
        },
      });
    const { notification, subscription } = delivery;
    const preferences = subscription.user.user_push_preferences;
    if (
      subscription.user.client_id !== delivery.client_id ||
      subscription.user_id !== notification.user_id ||
      !subscription.user.is_active ||
      !subscription.user.client.is_active ||
      !preferences?.enabled ||
      !Array.isArray(preferences.notification_types) ||
      !preferences.notification_types.includes(notification.type)
    ) {
      await finish("CANCELLED", "Recipient or preferences changed");
      continue;
    }
    if (delivery.attempts > MAX_ATTEMPTS || Date.now() - delivery.created_at.getTime() > 86400000) {
      await finish("FAILED", "Delivery retry window exhausted");
      continue;
    }
    let url = "/dashboard/notifications";
    if (notification.debtor_id) {
      const debtor = await prisma.debtor.findFirst({
        where: { id: notification.debtor_id, client_id: delivery.client_id },
        select: { external_id: true },
      });
      if (debtor) url = `/dashboard/default/debitor/${debtor.external_id}`;
    }
    const result = await sendPushNotification(
      subscription,
      {
        title: notification.title,
        message: notification.message,
        type: notification.type,
        notificationId: notification.id,
        tag: `notification-${notification.id}`,
        url,
        icon: "/avatars/user.png",
        badge: "/avatars/user.png",
        requireInteraction: ["OVERDUE_PAYMENT", "PAYMENT_REMINDER"].includes(notification.type),
      },
      1,
    );
    if (result === "sent") await finish("SENT");
    else if (result === "expired") {
      await prisma.$transaction(async (tx) => {
        // A lease may have expired during the send. Fence stale workers before deleting a device.
        const fenced = await tx.pushDelivery.updateMany({
          where,
          data: { status: "CANCELLED", lease_token: null, locked_until: null },
        });
        if (fenced.count)
          await tx.pushSubscription.deleteMany({
            where: { id: subscription.id, user_id: notification.user_id!, user: { client_id: delivery.client_id } },
          });
      });
    } else {
      await prisma.pushDelivery.updateMany({
        where,
        data: {
          status: delivery.attempts >= MAX_ATTEMPTS ? "FAILED" : "PENDING",
          available_at: retryAt(delivery.attempts),
          lease_token: null,
          locked_until: null,
          last_error: "Push provider or configuration failure",
        },
      });
    }
  }
  return processed;
}
