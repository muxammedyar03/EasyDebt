import { prisma } from "@/lib/prisma";
import type { Prisma } from "@prisma/client";
import { enqueueNotificationPush } from "@/lib/push/outbox";

export type NotificationType =
  | "OVERDUE_PAYMENT"
  | "PAYMENT_RECEIVED"
  | "DEBT_ADDED"
  | "DEBT_LIMIT_EXCEEDED"
  | "HOSTING_REMINDER"
  | "PAYMENT_REMINDER";

interface CreateNotificationData {
  userId?: number;
  clientId: number;
  debtorId?: number;
  type: NotificationType;
  title: string;
  message: string;
}

export async function createNotification(data: CreateNotificationData) {
  return prisma.$transaction((tx) => createNotificationInTransaction(tx, data));
}

/** Store the in-app notification and its device deliveries in the same commit. */
export async function createNotificationInTransaction(tx: Prisma.TransactionClient, data: CreateNotificationData) {
  if (data.userId) {
    const user = await tx.user.findFirst({
      where: { id: data.userId, client_id: data.clientId },
      select: { id: true },
    });
    if (!user) throw new Error("Notification user does not belong to client");
  }
  if (data.debtorId) {
    const debtor = await tx.debtor.findFirst({
      where: { id: data.debtorId, client_id: data.clientId },
      select: { id: true },
    });
    if (!debtor) throw new Error("Notification debtor does not belong to client");
  }
  const notification = await tx.notification.create({
    data: {
      user_id: data.userId,
      client_id: data.clientId,
      debtor_id: data.debtorId,
      type: data.type,
      title: data.title,
      message: data.message,
    },
  });
  await enqueueNotificationPush(tx, notification);
  return notification;
}

export async function getUnreadNotifications(clientId: number, userId?: number) {
  const where: { client_id: number; user_id?: number; is_read: boolean } = {
    client_id: clientId,
    is_read: false,
  };

  if (userId) {
    where.user_id = userId;
  }

  return await prisma.notification.findMany({
    where,
    orderBy: { created_at: "desc" },
    take: 50,
  });
}

export async function markNotificationAsRead(clientId: number, notificationId: number) {
  try {
    await prisma.notification.updateMany({
      where: { id: notificationId, client_id: clientId },
      data: { is_read: true },
    });
  } catch (error) {
    console.error("Failed to mark notification as read:", error);
  }
}

export async function markAllNotificationsAsRead(clientId: number, userId?: number) {
  try {
    const where: { client_id: number; user_id?: number } = { client_id: clientId };
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
