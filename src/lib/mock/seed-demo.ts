import { Prisma, PaymentType, UserRole, NotificationType } from "@prisma/client";

export interface MockUserRow {
  id: number;
  username: string;
  name: string;
  role: UserRole;
  password?: string;
  is_active?: boolean;
  client_id?: number | null;
  created_at: Date;
  updated_at: Date;
}

export interface MockDebtorRow {
  id: number;
  external_id: string;
  first_name: string;
  last_name: string;
  phone_number?: string | null;
  address?: string | null;
  total_debt: Prisma.Decimal;
  last_payment_date: Date | null;
  is_overdue?: boolean;
  created_at: Date;
  updated_at: Date;
  created_by?: number | null;
  client_id?: number | null;
}

export interface MockDebtRow {
  id: number;
  external_id: string;
  debtor_id: number;
  amount: Prisma.Decimal;
  description?: string | null;
  items?: unknown;
  created_at: Date;
  created_by?: number | null;
  client_id?: number | null;
}

export interface MockPaymentRow {
  id: number;
  external_id: string;
  debtor_id: number;
  amount: Prisma.Decimal;
  payment_type: PaymentType;
  note?: string | null;
  created_at: Date;
  created_by?: number | null;
  client_id?: number | null;
}

export interface MockSettingRow {
  id: number;
  key: string;
  value: string;
  created_at: Date;
  updated_at: Date;
}

export interface MockPaymentReminderRow {
  id: number;
  debtor_id: number;
  reminder_at: Date;
  notified_at: Date | null;
  note?: string | null;
  created_at: Date;
  updated_at: Date;
}

export interface MockAuditLogRow {
  id: number;
  action: string;
  entity_type: string;
  entity_id: number;
  details?: unknown;
  created_at: Date;
  user_id?: number | null;
}

export interface MockNotificationRow {
  id: number;
  title: string;
  message: string;
  type: NotificationType;
  read: boolean;
  created_at: Date;
  user_id?: number | null;
}

export interface MockStoreData {
  users: MockUserRow[];
  debtors: MockDebtorRow[];
  debts: MockDebtRow[];
  payments: MockPaymentRow[];
  settings: MockSettingRow[];
  paymentReminders: MockPaymentReminderRow[];
  auditLogs: MockAuditLogRow[];
  notifications: MockNotificationRow[];
  nextId: {
    user: number;
    debtor: number;
    debt: number;
    payment: number;
    settings?: number;
    reminder?: number;
  };
}

export function createDemoMockStore(): MockStoreData {
  return {
    users: [],
    debtors: [],
    debts: [],
    payments: [],
    settings: [],
    paymentReminders: [],
    auditLogs: [],
    notifications: [],
    nextId: {
      user: 1,
      debtor: 1,
      debt: 1,
      payment: 1,
      settings: 1,
      reminder: 1,
    },
  };
}
