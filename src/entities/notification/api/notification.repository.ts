import { prisma } from "@/lib/prisma";
import type { Prisma } from "@prisma/client";

/**
 * Notification entity – API (repository).
 * Data access only; no business logic.
 */
export class NotificationRepository {
  async findMany(
    where: Prisma.NotificationWhereInput,
    options?: {
      skip?: number;
      take?: number;
      orderBy?: Prisma.NotificationOrderByWithRelationInput;
    },
  ) {
    return prisma.notification.findMany({
      where,
      ...options,
    });
  }

  async count(where: Prisma.NotificationWhereInput) {
    return prisma.notification.count({ where });
  }
}

export const notificationRepository = new NotificationRepository();
