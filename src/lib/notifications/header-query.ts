import type { NotificationType, Prisma } from "@prisma/client";

/** Types shown in header dropdown / unread badge (matches list API default). */
export const HEADER_NOTIFICATION_TYPES: NotificationType[] = [
  "OVERDUE_PAYMENT",
  "DEBT_LIMIT_EXCEEDED",
  "HOSTING_REMINDER",
  "PAYMENT_REMINDER",
];

export function buildHeaderNotificationsWhere(userId?: number, unreadOnly = true): Prisma.NotificationWhereInput {
  const andConditions: Prisma.NotificationWhereInput[] = [{ type: { in: HEADER_NOTIFICATION_TYPES } }];

  if (unreadOnly) {
    andConditions.push({ is_read: false });
  }

  if (userId) {
    andConditions.push({
      OR: [{ user_id: userId }, { user_id: null }],
    });
  }

  return { AND: andConditions };
}
