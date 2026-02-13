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

/**
 * Send push notification to a single subscription
 */
export async function sendPushNotification(
  subscription: { endpoint: string; p256dh: string; auth: string },
  payload: PushNotificationPayload,
): Promise<boolean> {
  try {
    ensureVapidInitialized();

    const pushSubscription = {
      endpoint: subscription.endpoint,
      keys: {
        p256dh: subscription.p256dh,
        auth: subscription.auth,
      },
    };

    await webPush.sendNotification(pushSubscription, JSON.stringify(payload));
    return true;
  } catch (error) {
    // Handle invalid/expired subscriptions
    if (
      (error as { statusCode?: number }).statusCode === 410 ||
      (error as { statusCode?: number }).statusCode === 404
    ) {
      console.log("[Push] Subscription expired or invalid, should be removed");
      return false;
    }
    console.error("[Push] Failed to send notification:", error);
    return false;
  }
}

/**
 * Send push notification to a user
 * Checks user preferences before sending
 */
export async function sendPushToUser(userId: number, payload: PushNotificationPayload): Promise<number> {
  try {
    // Check if user has push notifications enabled
    const preferences = await prisma.userPushPreferences.findUnique({
      where: { user_id: userId },
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
      where: { user_id: userId },
    });

    if (subscriptions.length === 0) {
      console.log(`[Push] User ${userId} has no push subscriptions`);
      return 0;
    }

    let sentCount = 0;
    const invalidSubscriptions: number[] = [];

    // Send to all subscriptions
    for (const subscription of subscriptions) {
      const success = await sendPushNotification(
        {
          endpoint: subscription.endpoint,
          p256dh: subscription.p256dh,
          auth: subscription.auth,
        },
        payload,
      );

      if (success) {
        sentCount++;
      } else {
        invalidSubscriptions.push(subscription.id);
      }
    }

    // Remove invalid subscriptions
    if (invalidSubscriptions.length > 0) {
      await prisma.pushSubscription.deleteMany({
        where: { id: { in: invalidSubscriptions } },
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
    await sendPushToUser(userId, {
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
export async function sendPushToAllSubscribers(payload: PushNotificationPayload): Promise<number> {
  try {
    const subscriptions = await prisma.pushSubscription.findMany({
      include: {
        user: {
          include: {
            push_preferences: true,
          },
        },
      },
    });

    let sentCount = 0;
    const invalidSubscriptions: number[] = [];

    for (const subscription of subscriptions) {
      // Check user preferences
      const preferences = subscription.user.push_preferences;
      if (!preferences || !preferences.enabled) {
        continue;
      }

      // Check notification type
      const enabledTypes = (preferences.notification_types as string[]) || [];
      if (payload.type && !enabledTypes.includes(payload.type)) {
        continue;
      }

      const success = await sendPushNotification(
        {
          endpoint: subscription.endpoint,
          p256dh: subscription.p256dh,
          auth: subscription.auth,
        },
        payload,
      );

      if (success) {
        sentCount++;
      } else {
        invalidSubscriptions.push(subscription.id);
      }
    }

    // Remove invalid subscriptions
    if (invalidSubscriptions.length > 0) {
      await prisma.pushSubscription.deleteMany({
        where: { id: { in: invalidSubscriptions } },
      });
    }

    return sentCount;
  } catch (error) {
    console.error("[Push] Failed to send push to all subscribers:", error);
    return 0;
  }
}
