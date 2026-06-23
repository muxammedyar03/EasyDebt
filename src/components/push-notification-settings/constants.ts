import type { NotificationType } from "@/lib/notifications";

export const NOTIFICATION_TYPE_LABELS: Record<NotificationType, string> = {
  OVERDUE_PAYMENT: "Просроченный платеж",
  PAYMENT_RECEIVED: "Платеж получен",
  DEBT_ADDED: "Долг добавлен",
  DEBT_LIMIT_EXCEEDED: "Превышение лимита долга",
  HOSTING_REMINDER: "Напоминание о хостинге",
  PAYMENT_REMINDER: "Напоминание о платеже",
} as const;
