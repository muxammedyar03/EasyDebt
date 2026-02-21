import { prisma } from "@/lib/prisma";
import { sendPushForNotification } from "@/lib/push/push-service";

export type NotificationType =
  | "OVERDUE_PAYMENT"
  | "PAYMENT_RECEIVED"
  | "DEBT_ADDED"
  | "DEBT_LIMIT_EXCEEDED"
  | "HOSTING_REMINDER"
  | "PAYMENT_REMINDER";

interface CreateNotificationData {
  userId?: number;
  shopId: number; // Required
  debtorId?: number;
  type: NotificationType;
  title: string;
  message: string;
}

export async function createNotification(data: CreateNotificationData) {
  try {
    if (!data.shopId) {
      throw new Error("Shop ID is required for notification");
    }

    const notification = await prisma.notification.create({
      data: {
        user_id: data.userId,
        shop_id: data.shopId,
        debtor_id: data.debtorId,
        type: data.type,
        title: data.title,
        message: data.message,
      },
    });

    // Push: yaratilgan foydalanuvchi (userId) ning barcha push yoqilgan qurilmalariga yuboriladi
    if (data.userId) {
      let url = "/dashboard/notifications";
      if (data.debtorId) {
        const debtor = await prisma.debtor.findUnique({
          where: { id: data.debtorId },
          select: { external_id: true },
        });
        url = debtor ? `/dashboard/default/debitor/${debtor.external_id}` : url;
      }
      sendPushForNotification(data.userId, data.type, data.title, data.message, notification.id, url).catch((err) =>
        console.error("[notifications] Push send failed:", err),
      );
    }
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
  try {
    await prisma.notification.update({
      where: { id: notificationId },
      data: { is_read: true },
    });
  } catch (error) {
    console.error("Failed to mark notification as read:", error);
  }
}

export async function markAllNotificationsAsRead(userId?: number) {
  try {
    const where: { user_id?: number } = {};
    if (userId) {
      where.user_id = userId;
    }

    await prisma.notification.updateMany({
      where,
      data: { is_read: true },
    });
  } catch (error) {
    console.error("Failed to mark all notifications as read:", error);
  }
}
