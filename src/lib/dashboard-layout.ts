import type { NotificationType } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/auth";
import { settingsRepository } from "@/entities/settings/api";
import { buildHeaderNotificationsWhere } from "@/lib/notifications/header-query";

export type DashboardLayoutUser = {
  id: string;
  name: string;
  username: string;
  email: string;
  avatar: string;
  role: string;
};

export type DashboardLayoutNotification = {
  id: number;
  created_at: Date;
  user_id: number | null;
  debtor_id: number | null;
  debtor_external_id: string | null;
  type: NotificationType;
  title: string;
  message: string;
  is_read: boolean;
};

export type DashboardLayoutData = {
  session: Awaited<ReturnType<typeof getSession>>;
  debtLimit: number;
  overdueDays: number;
  activeUser: DashboardLayoutUser;
  notifications: DashboardLayoutNotification[];
  unreadCount: number;
};

const DEFAULT_ACTIVE_USER: DashboardLayoutUser = {
  id: "1",
  name: "",
  username: "",
  email: "",
  avatar: "/avatars/user.png",
  role: "SUPER_ADMIN",
};

/**
 * Single data fetch for dashboard layout: session, settings, user, notifications with debtor external IDs.
 * Use this in dashboard layout instead of multiple separate prisma/settings calls.
 */
export async function getDashboardLayoutData(): Promise<DashboardLayoutData> {
  const session = await getSession();

  const [debtLimit, overdueDays, user] = await Promise.all([
    settingsRepository.getDebtLimit(),
    settingsRepository.getOverdueDays(),
    session
      ? prisma.user.findUnique({
          where: { id: session.userId },
          select: {
            id: true,
            username: true,
            email: true,
            first_name: true,
            last_name: true,
            role: true,
          },
        })
      : null,
  ]);

  const headerWhere = buildHeaderNotificationsWhere(session?.userId, true);

  const [notificationsRaw, unreadCount] = await Promise.all([
    prisma.notification.findMany({
      where: headerWhere,
      orderBy: { created_at: "desc" },
      take: 5,
    }),
    prisma.notification.count({ where: headerWhere }),
  ]);

  const debtorIds = [...new Set(notificationsRaw.map((n) => n.debtor_id).filter(Boolean))] as number[];
  const idToExternalId = new Map<number, string>();
  if (debtorIds.length > 0) {
    const debtors = await prisma.debtor.findMany({
      where: { id: { in: debtorIds } },
      select: { id: true, external_id: true },
    });
    debtors.forEach((d) => idToExternalId.set(d.id, d.external_id));
  }

  const notifications: DashboardLayoutNotification[] = notificationsRaw.map((n) => ({
    ...n,
    debtor_external_id: n.debtor_id ? (idToExternalId.get(n.debtor_id) ?? null) : null,
  }));

  const activeUser: DashboardLayoutUser = user
    ? {
        id: user.id.toString(),
        name: user.first_name && user.last_name ? `${user.first_name} ${user.last_name}` : user.username,
        username: user.username,
        email: user.email || "",
        avatar: `/avatars/${user.username}.png`,
        role: user.role,
      }
    : DEFAULT_ACTIVE_USER;

  return {
    session,
    debtLimit,
    overdueDays,
    activeUser,
    notifications,
    unreadCount,
  };
}
