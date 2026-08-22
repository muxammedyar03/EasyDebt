import type { QueryClient } from "@tanstack/react-query";
import type { NotificationType } from "@prisma/client";

export type HeaderNotification = {
  id: number;
  created_at: string | Date;
  user_id: number | null;
  debtor_id: number | null;
  debtor_external_id: string | null;
  type: NotificationType;
  title: string;
  message: string;
  is_read: boolean;
};

export const notificationKeys = {
  all: ["notifications"] as const,
  unreadCount: () => [...notificationKeys.all, "unread-count"] as const,
  unreadPreview: () => [...notificationKeys.all, "unread-preview"] as const,
};

/** Call after actions that may create notifications (e.g. add debt over limit). */
export function invalidateHeaderNotifications(queryClient: QueryClient) {
  return queryClient.invalidateQueries({ queryKey: notificationKeys.all });
}

export async function fetchUnreadNotificationCount(): Promise<number> {
  const res = await fetch("/api/notifications/unread-count", { cache: "no-store" });
  if (!res.ok) {
    throw new Error("Failed to fetch unread count");
  }
  const data = (await res.json()) as { count: number };
  return data.count ?? 0;
}

export async function fetchUnreadNotificationPreview(): Promise<{
  notifications: HeaderNotification[];
  total: number;
}> {
  const res = await fetch("/api/notifications?page=1&pageSize=5&read=false", { cache: "no-store" });
  if (!res.ok) {
    throw new Error("Failed to fetch notifications");
  }
  return res.json();
}

export async function markNotificationRead(id: number): Promise<void> {
  const res = await fetch(`/api/notifications/${id}`, { method: "PATCH" });
  if (!res.ok) {
    throw new Error("Failed to mark notification as read");
  }
}
