import { prisma } from "@/lib/prisma";
import { isMockMode } from "@/lib/mock/is-mock-mode";
import { mockMarkAllNotificationsRead, mockMarkNotificationRead } from "@/lib/mock";
import { notificationRepository } from "@/entities/notification/api";

export type NotificationType =
  | "OVERDUE_PAYMENT"
  | "PAYMENT_RECEIVED"
  | "DEBT_ADDED"
  | "DEBT_LIMIT_EXCEEDED"
  | "HOSTING_REMINDER"
  | "PAYMENT_REMINDER";

interface CreateNotificationData {
  userId?: number;
  debtorId?: number;
  type: NotificationType;
  title: string;
  message: string;
}

export async function createNotification(data: CreateNotificationData) {
  if (isMockMode()) return;
  try {
    const notification = await prisma.notification.create({
      data: {
        user_id: data.userId,
        debtor_id: data.debtorId,
        type: data.type,
        title: data.title,
        message: data.message,
      },
    });
  } catch (error) {
    console.error("Failed to create notification:", error);
  }
}

export async function getUnreadNotifications(userId?: number) {
  const where: { user_id?: number; is_read: boolean } = { is_read: false };

  if (userId) {
    where.user_id = userId;
  }

  return await prisma.notification.findMany({
    where,
    orderBy: { created_at: "desc" },
    take: 50,
  });
}

export async function markNotificationAsRead(notificationId: number) {
  if (isMockMode()) {
    mockMarkNotificationRead(notificationId);
    return;
  }
  try {
    await notificationRepository.update(notificationId, { is_read: true });
  } catch (error) {
    console.error("Failed to mark notification as read:", error);
  }
}

export async function markAllNotificationsAsRead(userId?: number) {
  if (isMockMode()) {
    mockMarkAllNotificationsRead(userId);
    return;
  }
  try {
    const where: { user_id?: number } = {};
    if (userId) {
      where.user_id = userId;
    }

    await notificationRepository.updateMany(where, { is_read: true });
  } catch (error) {
    console.error("Failed to mark all notifications as read:", error);
  }
}
