import type { NotificationType } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/auth";
import { requireClientId } from "@/lib/tenant";
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

export type DashboardLayoutClient = {
  id: number;
  name: string;
  slug: string;
  is_active: boolean;
};

export type DashboardLayoutData = {
  session: Awaited<ReturnType<typeof getSession>>;
  debtLimit: number;
  overdueDays: number;
  activeUser: DashboardLayoutUser;
  notifications: DashboardLayoutNotification[];
  unreadCount: number;
  currentClient: DashboardLayoutClient | null;
  clients: DashboardLayoutClient[];
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
 */
export async function getDashboardLayoutData(): Promise<DashboardLayoutData> {
  const session = await getSession();
  const clientId = session ? requireClientId(session) : null;

  const isSuperAdmin = session?.role === "SUPER_ADMIN";

  const [debtLimit, overdueDays, user, currentClient, clients] = await Promise.all([
    clientId ? settingsRepository.getDebtLimit(clientId) : Promise.resolve(2_000_000),
    clientId ? settingsRepository.getOverdueDays(clientId) : Promise.resolve(45),
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
    clientId
      ? prisma.client.findUnique({
          where: { id: clientId },
          select: { id: true, name: true, slug: true, is_active: true },
        })
      : null,
    isSuperAdmin
      ? prisma.client.findMany({
          orderBy: { name: "asc" },
          select: { id: true, name: true, slug: true, is_active: true },
        })
      : Promise.resolve([]),
  ]);

  if (!session || !clientId) {
    return {
      session,
      debtLimit,
      overdueDays,
      activeUser: DEFAULT_ACTIVE_USER,
      notifications: [],
      unreadCount: 0,
      currentClient: null,
      clients: [],
    };
  }

  const headerWhere = buildHeaderNotificationsWhere(clientId, session.userId, true);

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
      where: { id: { in: debtorIds }, client_id: clientId },
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
    currentClient,
    clients,
  };
}
