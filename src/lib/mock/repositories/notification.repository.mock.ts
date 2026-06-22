import type { Prisma } from "@prisma/client";
import {
  mockCountNotifications,
  mockFindNotifications,
  mockMarkAllNotificationsRead,
  mockMarkNotificationRead,
} from "../mock-store";

export class MockNotificationRepository {
  async findMany(
    where: Prisma.NotificationWhereInput,
    options?: {
      skip?: number;
      take?: number;
      orderBy?: Prisma.NotificationOrderByWithRelationInput;
    },
  ) {
    return mockFindNotifications(where, options);
  }

  async count(where: Prisma.NotificationWhereInput) {
    return mockCountNotifications(where);
  }

  async update(id: number, data: Prisma.NotificationUpdateInput) {
    if (data.is_read === true) {
      mockMarkNotificationRead(id);
    }
    const rows = mockFindNotifications({ id });
    return rows[0] ?? null;
  }

  async updateMany(where: Prisma.NotificationWhereInput, data: Prisma.NotificationUpdateManyMutationInput) {
    if (data.is_read === true) {
      const userId = typeof where.user_id === "number" ? where.user_id : undefined;
      mockMarkAllNotificationsRead(userId);
    }
    return { count: mockCountNotifications(where) };
  }
}

export const mockNotificationRepository = new MockNotificationRepository();
