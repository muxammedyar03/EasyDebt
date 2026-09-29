/**
 * Push Notification Service
 *
 * Handles sending push notifications to subscribed users
 */

import * as webPush from "web-push";
import { prisma } from "@/lib/prisma";
import { getVapidKeys } from "./vapid-keys";
import type { NotificationType } from "@/lib/notifications";

// Initialize web-push with VAPID keys (lazy initialization)
let vapidInitialized = false;

function ensureVapidInitialized() {
  if (!vapidInitialized) {
    try {
      const vapidKeys = getVapidKeys();
      const vapidSubject = process.env.VAPID_SUBJECT || "mailto:admin@easydebt.uz";
      webPush.setVapidDetails(vapidSubject, vapidKeys.publicKey, vapidKeys.privateKey);
      vapidInitialized = true;
    } catch (error) {
      console.error("[Push] Failed to initialize VAPID keys:", error);
      throw error;
    }
  }
}

export interface PushNotificationPayload {
  title: string;
  message: string;
  url?: string;
  icon?: string;
  badge?: string;
  tag?: string;
  notificationId?: number;
  type?: NotificationType;
  requireInteraction?: boolean;
}

export type PushDeliveryResult = "sent" | "expired" | "retryable";

const retryDelay = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

/**
 * Send push notification to a single subscription
 */
export async function sendPushNotification(
  subscription: { endpoint: string; p256dh: string; auth: string },
  payload: PushNotificationPayload,
  maxAttempts = 3,
): Promise<PushDeliveryResult> {
  try {
    ensureVapidInitialized();
  } catch (error) {
    console.error("[Push] Configuration error:", error);
    return "retryable";
  }

  const pushSubscription = {
    endpoint: subscription.endpoint,
    keys: {
      p256dh: subscription.p256dh,
      auth: subscription.auth,
    },
  };

  for (let attempt = 0; attempt < maxAttempts; attempt++) {
    try {
      await webPush.sendNotification(pushSubscription, JSON.stringify(payload), { timeout: 10000 });
      return "sent";
    } catch (error) {
      const status = (error as { statusCode?: number }).statusCode;
      if (status === 410 || status === 404) return "expired";
      console.error("[Push] Delivery failed; subscription retained:", error);
      // Retry only transient transport errors, throttling, and provider failures.
      if (status && status !== 429 && status < 500) return "retryable";
      if (attempt + 1 < maxAttempts) await retryDelay(250 * 2 ** attempt);
    }
  }
  return "retryable";
}

/**
 * Send push notification to a user
 * Checks user preferences before sending
 */
export async function sendPushToUser(
  clientId: number,
  userId: number,
  payload: PushNotificationPayload,
): Promise<number> {
  try {
    // Check if user has push notifications enabled
    const preferences = await prisma.userPushPreferences.findUnique({
      where: { user_id: userId, user: { client_id: clientId } },
    });

    if (!preferences || !preferences.enabled) {
      console.log(`[Push] User ${userId} has push notifications disabled`);
      return 0;
    }

    // Check if notification type is enabled
    const enabledTypes = (preferences.notification_types as string[]) || [];
    if (payload.type && !enabledTypes.includes(payload.type)) {
      console.log(`[Push] User ${userId} has disabled notification type: ${payload.type}`);
      return 0;
    }

    // Get user's push subscriptions
    const subscriptions = await prisma.pushSubscription.findMany({
      where: { user_id: userId, user: { client_id: clientId } },
    });

    if (subscriptions.length === 0) {
      console.log(`[Push] User ${userId} has no push subscriptions`);
      return 0;
    }

    let sentCount = 0;
    const invalidSubscriptions: number[] = [];

    // Send to all subscriptions
    for (const subscription of subscriptions) {
      const result = await sendPushNotification(
        {
          endpoint: subscription.endpoint,
          p256dh: subscription.p256dh,
          auth: subscription.auth,
        },
        payload,
      );

      if (result === "sent") {
        sentCount++;
      } else if (result === "expired") {
        invalidSubscriptions.push(subscription.id);
      }
    }

    // Remove invalid subscriptions
    if (invalidSubscriptions.length > 0) {
      await prisma.pushSubscription.deleteMany({
        where: { id: { in: invalidSubscriptions }, user_id: userId, user: { client_id: clientId } },
      });
      console.log(`[Push] Removed ${invalidSubscriptions.length} invalid subscriptions`);
    }

    return sentCount;
  } catch (error) {
    console.error("[Push] Failed to send push to user:", error);
    return 0;
  }
}

/**
 * Send push notification when in-app notification is created
 */
export async function sendPushForNotification(
  clientId: number,
  userId: number | undefined,
  notificationType: NotificationType,
  title: string,
  message: string,
  notificationId?: number,
  url?: string,
): Promise<void> {
  if (!userId) {
    return;
  }

  try {
    await sendPushToUser(clientId, userId, {
      title,
      message,
      url: url || "/dashboard/notifications",
      icon: "/avatars/user.png",
      badge: "/avatars/user.png",
      tag: `notification-${notificationId || Date.now()}`,
      notificationId,
      type: notificationType,
      requireInteraction: notificationType === "OVERDUE_PAYMENT" || notificationType === "PAYMENT_REMINDER",
    });
  } catch (error) {
    console.error("[Push] Failed to send push for notification:", error);
  }
}

/**
 * Send push notification to all subscribed users (broadcast)
 */
export async function sendPushToAllSubscribers(clientId: number, payload: PushNotificationPayload): Promise<number> {
  try {
    const subscriptions = await prisma.pushSubscription.findMany({
      where: { user: { client_id: clientId } },
      include: {
        user: {
          include: {
            user_push_preferences: true,
          },
        },
      },
    });

    let sentCount = 0;
    const invalidSubscriptions: number[] = [];

    for (const subscription of subscriptions) {
      const preferences = subscription.user.user_push_preferences;
      if (!preferences || !preferences.enabled) {
        continue;
      }

      const enabledTypes = (preferences.notification_types as string[]) || [];
      if (payload.type && !enabledTypes.includes(payload.type)) {
        continue;
      }

      const result = await sendPushNotification(
        {
          endpoint: subscription.endpoint,
          p256dh: subscription.p256dh,
          auth: subscription.auth,
        },
        payload,
      );

      if (result === "sent") {
        sentCount++;
      } else if (result === "expired") {
        invalidSubscriptions.push(subscription.id);
      }
    }

    if (invalidSubscriptions.length > 0) {
      await prisma.pushSubscription.deleteMany({
        where: { id: { in: invalidSubscriptions }, user: { client_id: clientId } },
      });
    }

    return sentCount;
  } catch (error) {
    console.error("[Push] Failed to send push to all subscribers:", error);
    return 0;
  }
}
