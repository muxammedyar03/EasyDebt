import { PaymentType, Prisma, UserRole, NotificationType } from "@prisma/client";
import { randomUUID } from "crypto";

const FIRST_NAMES = [
  "James",
  "Emma",
  "Michael",
  "Olivia",
  "William",
  "Sophia",
  "David",
  "Isabella",
  "Robert",
  "Mia",
  "John",
  "Charlotte",
  "Daniel",
  "Amelia",
  "Matthew",
  "Harper",
  "Andrew",
  "Evelyn",
  "Joseph",
  "Abigail",
  "Ryan",
  "Emily",
  "Nathan",
  "Elizabeth",
  "Kevin",
  "Sofia",
  "Brian",
  "Avery",
  "Jason",
  "Ella",
  "Eric",
  "Scarlett",
  "Mark",
  "Grace",
  "Paul",
];

const LAST_NAMES = [
  "Smith",
  "Johnson",
  "Williams",
  "Brown",
  "Jones",
  "Garcia",
  "Miller",
  "Davis",
  "Rodriguez",
  "Martinez",
  "Wilson",
  "Anderson",
  "Taylor",
  "Thomas",
  "Moore",
  "Jackson",
  "Martin",
  "Lee",
  "Thompson",
  "White",
  "Harris",
  "Clark",
  "Lewis",
  "Walker",
  "Hall",
  "Allen",
  "Young",
  "King",
  "Wright",
  "Scott",
  "Green",
  "Baker",
  "Adams",
  "Nelson",
  "Carter",
];

const STREETS = [
  "Oak Street",
  "Maple Ave",
  "Pine Road",
  "Cedar Lane",
  "Elm Drive",
  "Birch Way",
  "Willow Court",
  "Ash Boulevard",
  "Cherry Place",
  "Walnut Street",
];

const DEBTOR_COUNT = 35;
const MOCK_AUDIT_COUNT = 30;
const MOCK_NOTIFICATION_COUNT = 30;
const MIN_DEBT = 10_000;
const MAX_DEBT = 2_000_000;

function dec(n: number) {
  return new Prisma.Decimal(n);
}

function randInt(min: number, max: number) {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

function randDate(daysBack: number) {
  const d = new Date();
  d.setDate(d.getDate() - randInt(0, daysBack));
  d.setHours(randInt(8, 18), randInt(0, 59), 0, 0);
  return d;
}

function phoneFor(i: number) {
  return `+1 555 ${String(100 + (i % 900)).padStart(3, "0")} ${String(randInt(1000, 9999))}`;
}

export type MockUserRow = {
  id: number;
  username: string;
  email: string;
  password: string;
  role: UserRole;
  first_name: string | null;
  last_name: string | null;
  is_active: boolean;
  created_at: Date;
  updated_at: Date;
};

export type MockDebtorRow = {
  id: number;
  external_id: string;
  first_name: string;
  last_name: string;
  phone_number: string | null;
  address: string | null;
  total_debt: Prisma.Decimal;
  last_payment_date: Date | null;
  is_overdue: boolean;
  created_at: Date;
  updated_at: Date;
  created_by: number;
};

export type MockDebtRow = {
  id: number;
  external_id: string;
  debtor_id: number;
  amount: Prisma.Decimal;
  description: string | null;
  items: Prisma.JsonValue;
  created_at: Date;
  created_by: number;
};

export type MockPaymentRow = {
  id: number;
  external_id: string;
  debtor_id: number;
  amount: Prisma.Decimal;
  payment_type: PaymentType;
  note: string | null;
  created_at: Date;
  created_by: number;
};

export type MockSettingRow = { id: number; key: string; value: string; created_at: Date; updated_at: Date };

export type MockPaymentReminderRow = {
  id: number;
  debtor_id: number;
  created_by: number;
  reminder_at: Date;
  note: string | null;
  status: "PENDING" | "NOTIFIED" | "COMPLETED" | "CANCELLED";
  notified_at: Date | null;
  created_at: Date;
  updated_at: Date;
};

export type MockAuditLogRow = {
  id: number;
  user_id: number | null;
  action: string;
  entity_type: string;
  entity_id: number | null;
  old_value: Prisma.JsonValue | null;
  new_value: Prisma.JsonValue | null;
  description: string | null;
  ip_address: string | null;
  user_agent: string | null;
  created_at: Date;
};

export type MockNotificationRow = {
  id: number;
  user_id: number | null;
  debtor_id: number | null;
  type: NotificationType;
  title: string;
  message: string;
  is_read: boolean;
  created_at: Date;
};

export type MockStoreData = {
  users: MockUserRow[];
  debtors: MockDebtorRow[];
  debts: MockDebtRow[];
  payments: MockPaymentRow[];
  settings: MockSettingRow[];
  paymentReminders: MockPaymentReminderRow[];
  auditLogs: MockAuditLogRow[];
  notifications: MockNotificationRow[];
  nextId: {
    debtor: number;
    debt: number;
    payment: number;
    reminder: number;
    user: number;
    auditLog: number;
    notification: number;
  };
};

export function createDemoMockStore(): MockStoreData {
  const now = new Date();
  const users: MockUserRow[] = [
    {
      id: 1,
      username: "admin",
      email: "admin@demo.local",
      password: "$mock$admin123",
      role: UserRole.ADMIN,
      first_name: "Admin",
      last_name: "User",
      is_active: true,
      created_at: now,
      updated_at: now,
    },
    {
      id: 2,
      username: "guest",
      email: "guest@demo.local",
      password: "$mock$guest123",
      role: UserRole.USER,
      first_name: "Demo",
      last_name: "Guest",
      is_active: true,
      created_at: now,
      updated_at: now,
    },
  ];

  const debtors: MockDebtorRow[] = [];
  const debts: MockDebtRow[] = [];
  const payments: MockPaymentRow[] = [];
  let debtId = 1;
  let paymentId = 1;

  for (let i = 0; i < DEBTOR_COUNT; i++) {
    const createdAt = randDate(180);
    const targetTotal = randInt(MIN_DEBT, MAX_DEBT);
    const debtorId = i + 1;
    const debtCount = randInt(1, 3);
    let remaining = targetTotal;
    const debtorDebts: MockDebtRow[] = [];

    for (let d = 0; d < debtCount; d++) {
      const isLast = d === debtCount - 1;
      const amount = isLast
        ? remaining
        : randInt(MIN_DEBT, Math.max(MIN_DEBT, Math.floor(remaining / (debtCount - d))));
      remaining -= amount;
      const debt: MockDebtRow = {
        id: debtId++,
        external_id: randomUUID(),
        debtor_id: debtorId,
        amount: dec(amount),
        description: `Demo purchase #${debtId}`,
        items: null,
        created_at: new Date(createdAt.getTime() + d * 86400000),
        created_by: 1,
      };
      debtorDebts.push(debt);
      debts.push(debt);
    }

    const totalDebtAmount = debtorDebts.reduce((s, x) => s + x.amount.toNumber(), 0);
    const payCount = Math.random() > 0.35 ? randInt(0, 2) : 0;
    let paid = 0;
    for (let p = 0; p < payCount; p++) {
      const maxPay = Math.max(0, totalDebtAmount - paid - MIN_DEBT / 2);
      if (maxPay < MIN_DEBT / 2) break;
      const payAmount = randInt(MIN_DEBT / 2, Math.min(maxPay, 500_000));
      paid += payAmount;
      payments.push({
        id: paymentId++,
        external_id: randomUUID(),
        debtor_id: debtorId,
        amount: dec(payAmount),
        payment_type: [PaymentType.CASH, PaymentType.CARD, PaymentType.CLICK][p % 3],
        note: "Demo payment",
        created_at: randDate(90),
        created_by: 1,
      });
    }

    const balance = totalDebtAmount - paid;
    debtors.push({
      id: debtorId,
      external_id: randomUUID(),
      first_name: FIRST_NAMES[i % FIRST_NAMES.length],
      last_name: LAST_NAMES[i % LAST_NAMES.length],
      phone_number: phoneFor(i),
      address: `${randInt(10, 999)} ${STREETS[i % STREETS.length]}`,
      total_debt: dec(Math.max(0, balance)),
      last_payment_date: payCount > 0 ? randDate(30) : null,
      is_overdue: Math.random() > 0.75,
      created_at: createdAt,
      updated_at: now,
      created_by: 1,
    });
  }

  const settings: MockSettingRow[] = [
    { id: 1, key: "debt_limit", value: "2000000", created_at: now, updated_at: now },
    { id: 2, key: "overdue_days", value: "45", created_at: now, updated_at: now },
  ];

  const paymentReminders: MockPaymentReminderRow[] = debtors.slice(0, 5).map((d, idx) => ({
    id: idx + 1,
    debtor_id: d.id,
    created_by: 1,
    reminder_at: new Date(Date.now() + (idx + 1) * 86400000),
    note: "Demo reminder",
    status: idx % 2 === 0 ? "PENDING" : "NOTIFIED",
    notified_at: idx % 2 === 1 ? now : null,
    created_at: now,
    updated_at: now,
  }));

  const auditTemplates = [
    { action: "CREATE", entity_type: "DEBTOR", description: "Должник создан" },
    { action: "UPDATE", entity_type: "DEBTOR", description: "Должник обновлён" },
    { action: "DELETE", entity_type: "DEBTOR", description: "Должник удалён" },
    { action: "DEBT_ADDED", entity_type: "DEBT", description: "Долг добавлен" },
    { action: "PAYMENT_ADDED", entity_type: "PAYMENT", description: "Платёж добавлен" },
    { action: "LOGIN", entity_type: "USER", description: "Вход в систему" },
    { action: "LOGOUT", entity_type: "USER", description: "Выход из системы" },
    { action: "EXPORT", entity_type: "DEBTOR", description: "Экспорт данных" },
    { action: "IMPORT", entity_type: "DEBTOR", description: "Импорт данных" },
    { action: "UPDATE", entity_type: "SETTINGS", description: "Настройки изменены" },
  ] as const;

  const auditLogs: MockAuditLogRow[] = Array.from({ length: MOCK_AUDIT_COUNT }, (_, i) => {
    const debtor = debtors[i % debtors.length];
    const template = auditTemplates[i % auditTemplates.length];
    const debt = debts.find((d) => d.debtor_id === debtor.id);
    const payment = payments.find((p) => p.debtor_id === debtor.id);
    const entityId =
      template.entity_type === "DEBTOR"
        ? debtor.id
        : template.entity_type === "DEBT"
          ? (debt?.id ?? debtor.id)
          : template.entity_type === "PAYMENT"
            ? (payment?.id ?? debtor.id)
            : template.entity_type === "USER"
              ? 1
              : 1;

    return {
      id: i + 1,
      user_id: template.action === "LOGIN" || template.action === "LOGOUT" ? 1 : i % 7 === 0 ? null : 1,
      action: template.action,
      entity_type: template.entity_type,
      entity_id: entityId,
      old_value: template.action === "UPDATE" ? { total_debt: debtor.total_debt.toNumber() } : null,
      new_value:
        template.entity_type === "DEBTOR" || template.entity_type === "DEBT" || template.entity_type === "PAYMENT"
          ? { debtor_id: debtor.id, amount: randInt(10_000, 500_000) }
          : null,
      description: `${template.description}: ${debtor.first_name} ${debtor.last_name}`,
      ip_address: `192.168.${(i % 10) + 1}.${(i % 200) + 10}`,
      user_agent: "Mozilla/5.0 (Demo)",
      created_at: randDate(90),
    };
  });

  const notificationTemplates: {
    type: NotificationType;
    title: string;
    message: (name: string, debt: number) => string;
  }[] = [
    {
      type: "OVERDUE_PAYMENT",
      title: "Просроченный",
      message: (name, debt) => `${name} — просрочка. Долг: ${debt.toLocaleString()} сум`,
    },
    {
      type: "DEBT_LIMIT_EXCEEDED",
      title: "Превышен лимит",
      message: (name, debt) => `${name} превысил лимит долга (${debt.toLocaleString()} сум)`,
    },
    {
      type: "HOSTING_REMINDER",
      title: "Напоминание",
      message: (name) => `Проверьте данные должника ${name}`,
    },
    {
      type: "PAYMENT_REMINDER",
      title: "Напоминание об оплате",
      message: (name, debt) => `Напомните ${name} об оплате (${debt.toLocaleString()} сум)`,
    },
  ];

  const notifications: MockNotificationRow[] = Array.from({ length: MOCK_NOTIFICATION_COUNT }, (_, i) => {
    const debtor = debtors[i % debtors.length];
    const template = notificationTemplates[i % notificationTemplates.length];
    const debt = debtor.total_debt.toNumber();
    return {
      id: i + 1,
      user_id: i % 4 === 0 ? null : 1,
      debtor_id: debtor.id,
      type: template.type,
      title: template.title,
      message: template.message(`${debtor.first_name} ${debtor.last_name}`, debt),
      is_read: i % 5 === 0,
      created_at: randDate(45),
    };
  });

  return {
    users,
    debtors,
    debts,
    payments,
    settings,
    paymentReminders,
    auditLogs,
    notifications,
    nextId: {
      debtor: debtors.length + 1,
      debt: debtId,
      payment: paymentId,
      reminder: paymentReminders.length + 1,
      user: users.length + 1,
      auditLog: auditLogs.length + 1,
      notification: notifications.length + 1,
    },
  };
}
