import type { NotificationType } from "@prisma/client";
import { getSession } from "@/lib/auth";
import { settingsRepository } from "@/entities/settings/api";
import { isMockMode, getMockStore } from "@/lib/mock";

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
};

const DEFAULT_ACTIVE_USER: DashboardLayoutUser = {
  id: "1",
  name: "",
  username: "",
  email: "",
  avatar: "/avatars/user.png",
  role: "SUPER_ADMIN",
};

function mapUserToActiveUser(user: {
  id: number;
  username: string;
  email: string | null;
  first_name: string | null;
  last_name: string | null;
  role: string;
}): DashboardLayoutUser {
  return {
    id: user.id.toString(),
    name: user.first_name && user.last_name ? `${user.first_name} ${user.last_name}` : user.username,
    username: user.username,
    email: user.email || "",
    avatar: `/avatars/${user.username}.png`,
    role: user.role,
  };
}

export async function getDashboardLayoutData(): Promise<DashboardLayoutData> {
  const session = await getSession();
  const [debtLimit, overdueDays] = await Promise.all([
    settingsRepository.getDebtLimit(),
    settingsRepository.getOverdueDays(),
  ]);

  if (isMockMode()) {
    const store = getMockStore();
    const user = session ? store.users.find((u) => u.id === session.userId) : null;
    const unread = store.notifications
      .filter((n) => !n.is_read)
      .sort((a, b) => b.created_at.getTime() - a.created_at.getTime())
      .slice(0, 3);

    const notifications: DashboardLayoutNotification[] = unread.map((n) => {
      const debtor = n.debtor_id ? store.debtors.find((d) => d.id === n.debtor_id) : null;
      return {
        ...n,
        debtor_external_id: debtor?.external_id ?? null,
      };
    });

    return {
      session,
      debtLimit,
      overdueDays,
      activeUser: user ? mapUserToActiveUser(user) : DEFAULT_ACTIVE_USER,
      notifications,
    };
  }

  const { prisma } = await import("@/lib/prisma");

  const user = session
    ? await prisma.user.findUnique({
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
    : null;

  const notificationsRaw = await prisma.notification.findMany({
    where: { is_read: false },
    orderBy: { created_at: "desc" },
    take: 3,
  });

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

  return {
    session,
    debtLimit,
    overdueDays,
    activeUser: user ? mapUserToActiveUser(user) : DEFAULT_ACTIVE_USER,
    notifications,
  };
}
