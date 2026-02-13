import type { NotificationType } from "@/lib/notifications";

export const NOTIFICATION_TYPE_LABELS: Record<NotificationType, string> = {
  OVERDUE_PAYMENT: "Muddati o'tgan to'lov",
  PAYMENT_RECEIVED: "To'lov qabul qilindi",
  DEBT_ADDED: "Qarz qo'shildi",
  DEBT_LIMIT_EXCEEDED: "Qarz limiti oshdi",
  HOSTING_REMINDER: "Hosting eslatmasi",
  PAYMENT_REMINDER: "To'lov eslatmasi",
} as const;
