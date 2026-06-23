import { prisma } from "@/lib/prisma";
import { Prisma } from "@prisma/client";
import { shouldUseMockData } from "@/lib/mock/is-mock-mode";
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
  shopId?: number;
  debtorId?: number;
  type: NotificationType;
  title: string;
  message: string;
}

async function resolveShopId(data: CreateNotificationData): Promise<number | undefined> {
  if (data.shopId) return data.shopId;

  if (data.debtorId) {
    const debtor = await prisma.debtor.findUnique({ where: { id: data.debtorId } });
    const shopId = (debtor as { shop_id?: number } | null)?.shop_id;
    if (shopId) return shopId;
  }

  if (data.userId) {
    const user = await prisma.user.findUnique({ where: { id: data.userId } });
    const shopId = (user as { shop_id?: number } | null)?.shop_id;
    if (shopId) return shopId;
  }

  const prismaWithShop = prisma as typeof prisma & {
    shop?: { findFirst: (args: object) => Promise<{ id: number } | null> };
  };
  const shop = await prismaWithShop.shop?.findFirst({
    where: { is_active: true },
    select: { id: true },
  });

  return shop?.id;
}

export async function createNotification(data: CreateNotificationData) {
  if (await shouldUseMockData()) return;
  try {
    const shopId = await resolveShopId(data);

    await prisma.notification.create({
      data: {
        ...(shopId !== undefined ? { shop_id: shopId } : {}),
        user_id: data.userId ?? null,
        debtor_id: data.debtorId ?? null,
        type: data.type,
        title: data.title,
        message: data.message,
      } as Prisma.NotificationUncheckedCreateInput,
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
  if (await shouldUseMockData()) {
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
  if (await shouldUseMockData()) {
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
