import fs from "fs";
import path from "path";
import os from "os";
import { Prisma, PaymentType, UserRole, NotificationType } from "@prisma/client";
import {
  createDemoMockStore,
  type MockStoreData,
  type MockUserRow,
  type MockDebtorRow,
  type MockDebtRow,
  type MockPaymentRow,
  type MockSettingRow,
  type MockPaymentReminderRow,
  type MockAuditLogRow,
  type MockNotificationRow,
} from "@/lib/mock/seed-demo";

export type SyncEntityType = "DEBTOR" | "DEBT" | "PAYMENT" | "PAYMENT_REMINDER" | "SETTINGS";
export type SyncOperation = "CREATE" | "UPDATE" | "DELETE";
export type SyncItemStatus = "PENDING" | "SYNCED" | "FAILED";

export interface SyncOutboxItem {
  id: string;
  entityType: SyncEntityType;
  operation: SyncOperation;
  entityId: number;
  externalId: string;
  entityLabel: string;
  payload: Record<string, unknown>;
  status: SyncItemStatus;
  retryCount: number;
  errorMessage: string | null;
  createdAt: string;
  syncedAt: string | null;
}

export interface SyncMetadata {
  lastSyncedAt: string | null;
  offlineModeForced: boolean;
  remoteReachable: boolean;
  lastSyncError: string | null;
  totalSyncedCount: number;
  autoSyncIntervalSec: number;
  minimizeToTray: boolean;
  nativeNotifications: boolean;
  thermalPaperWidth: "80mm" | "58mm";
  remoteServerUrl: string;
}

export interface SerializedLocalDatabase {
  version: number;
  updatedAt: string;
  syncMeta: SyncMetadata;
  syncOutbox: SyncOutboxItem[];
  store: {
    users: Array<Omit<MockUserRow, "created_at" | "updated_at"> & { created_at: string; updated_at: string }>;
    debtors: Array<
      Omit<MockDebtorRow, "total_debt" | "last_payment_date" | "created_at" | "updated_at"> & {
        total_debt: string;
        last_payment_date: string | null;
        created_at: string;
        updated_at: string;
      }
    >;
    debts: Array<
      Omit<MockDebtRow, "amount" | "created_at"> & {
        amount: string;
        created_at: string;
      }
    >;
    payments: Array<
      Omit<MockPaymentRow, "amount" | "created_at"> & {
        amount: string;
        created_at: string;
      }
    >;
    settings: Array<Omit<MockSettingRow, "created_at" | "updated_at"> & { created_at: string; updated_at: string }>;
    paymentReminders: Array<
      Omit<MockPaymentReminderRow, "reminder_at" | "notified_at" | "created_at" | "updated_at"> & {
        reminder_at: string;
        notified_at: string | null;
        created_at: string;
        updated_at: string;
      }
    >;
    auditLogs: Array<Omit<MockAuditLogRow, "created_at"> & { created_at: string }>;
    notifications: Array<Omit<MockNotificationRow, "created_at"> & { created_at: string }>;
    nextId: MockStoreData["nextId"];
  };
}

const DEFAULT_SYNC_META: SyncMetadata = {
  lastSyncedAt: null,
  offlineModeForced: false,
  remoteReachable: true,
  lastSyncError: null,
  totalSyncedCount: 0,
  autoSyncIntervalSec: 30,
  minimizeToTray: true,
  nativeNotifications: true,
  thermalPaperWidth: "80mm",
  remoteServerUrl: process.env.NEXT_PUBLIC_SYNC_SERVER_URL || "https://easydebt.uz",
};

function resolveLocalDbFilePath(): string {
  if (process.env.EASYDEBT_LOCAL_DB_PATH) {
    return process.env.EASYDEBT_LOCAL_DB_PATH;
  }
  const workspaceDir = path.join(process.cwd(), ".local-data");
  try {
    if (!fs.existsSync(workspaceDir)) {
      fs.mkdirSync(workspaceDir, { recursive: true });
    }
    return path.join(workspaceDir, "easydebt-desktop-db.json");
  } catch {
    const fallbackDir = path.join(os.tmpdir(), "easydebt-desktop");
    if (!fs.existsSync(fallbackDir)) {
      fs.mkdirSync(fallbackDir, { recursive: true });
    }
    return path.join(fallbackDir, "easydebt-desktop-db.json");
  }
}

export function serializeStore(
  store: MockStoreData,
  syncMeta: SyncMetadata,
  syncOutbox: SyncOutboxItem[],
): SerializedLocalDatabase {
  return {
    version: 2,
    updatedAt: new Date().toISOString(),
    syncMeta,
    syncOutbox,
    store: {
      users: store.users.map((u) => ({
        ...u,
        created_at: u.created_at.toISOString(),
        updated_at: u.updated_at.toISOString(),
      })),
      debtors: store.debtors.map((d) => ({
        ...d,
        total_debt: d.total_debt.toString(),
        last_payment_date: d.last_payment_date ? d.last_payment_date.toISOString() : null,
        created_at: d.created_at.toISOString(),
        updated_at: d.updated_at.toISOString(),
      })),
      debts: store.debts.map((d) => ({
        ...d,
        amount: d.amount.toString(),
        created_at: d.created_at.toISOString(),
      })),
      payments: store.payments.map((p) => ({
        ...p,
        amount: p.amount.toString(),
        created_at: p.created_at.toISOString(),
      })),
      settings: store.settings.map((s) => ({
        ...s,
        created_at: s.created_at.toISOString(),
        updated_at: s.updated_at.toISOString(),
      })),
      paymentReminders: store.paymentReminders.map((r) => ({
        ...r,
        reminder_at: r.reminder_at.toISOString(),
        notified_at: r.notified_at ? r.notified_at.toISOString() : null,
        created_at: r.created_at.toISOString(),
        updated_at: r.updated_at.toISOString(),
      })),
      auditLogs: store.auditLogs.map((a) => ({
        ...a,
        created_at: a.created_at.toISOString(),
      })),
      notifications: store.notifications.map((n) => ({
        ...n,
        created_at: n.created_at.toISOString(),
      })),
      nextId: store.nextId,
    },
  };
}

export function deserializeStore(raw: SerializedLocalDatabase): {
  store: MockStoreData;
  syncMeta: SyncMetadata;
  syncOutbox: SyncOutboxItem[];
} {
  const s = raw.store;
  const store: MockStoreData = {
    users: s.users.map((u) => ({
      ...u,
      role: u.role as UserRole,
      created_at: new Date(u.created_at),
      updated_at: new Date(u.updated_at),
    })),
    debtors: s.debtors.map((d) => ({
      ...d,
      total_debt: new Prisma.Decimal(d.total_debt),
      last_payment_date: d.last_payment_date ? new Date(d.last_payment_date) : null,
      created_at: new Date(d.created_at),
      updated_at: new Date(d.updated_at),
    })),
    debts: s.debts.map((d) => ({
      ...d,
      amount: new Prisma.Decimal(d.amount),
      created_at: new Date(d.created_at),
    })),
    payments: s.payments.map((p) => ({
      ...p,
      amount: new Prisma.Decimal(p.amount),
      payment_type: p.payment_type as PaymentType,
      created_at: new Date(p.created_at),
    })),
    settings: s.settings.map((st) => ({
      ...st,
      created_at: new Date(st.created_at),
      updated_at: new Date(st.updated_at),
    })),
    paymentReminders: s.paymentReminders.map((r) => ({
      ...r,
      reminder_at: new Date(r.reminder_at),
      notified_at: r.notified_at ? new Date(r.notified_at) : null,
      created_at: new Date(r.created_at),
      updated_at: new Date(r.updated_at),
    })),
    auditLogs: s.auditLogs.map((a) => ({
      ...a,
      created_at: new Date(a.created_at),
    })),
    notifications: s.notifications.map((n) => ({
      ...n,
      type: n.type as NotificationType,
      created_at: new Date(n.created_at),
    })),
    nextId: s.nextId,
  };

  return {
    store,
    syncMeta: { ...DEFAULT_SYNC_META, ...(raw.syncMeta || {}) },
    syncOutbox: Array.isArray(raw.syncOutbox) ? raw.syncOutbox : [],
  };
}

interface GlobalLocalDbState {
  store: MockStoreData;
  syncMeta: SyncMetadata;
  syncOutbox: SyncOutboxItem[];
  initialized: boolean;
}

const globalForLocalDb = globalThis as unknown as {
  __easyDebtLocalDb?: GlobalLocalDbState;
};

function ensureInitialized(): GlobalLocalDbState {
  if (globalForLocalDb.__easyDebtLocalDb?.initialized) {
    return globalForLocalDb.__easyDebtLocalDb;
  }

  const filePath = resolveLocalDbFilePath();
  try {
    if (fs.existsSync(/*turbopackIgnore: true*/ filePath)) {
      const content = fs.readFileSync(/*turbopackIgnore: true*/ filePath, "utf-8");
      const parsed = JSON.parse(content) as SerializedLocalDatabase;
      const { store, syncMeta, syncOutbox } = deserializeStore(parsed);
      globalForLocalDb.__easyDebtLocalDb = {
        store,
        syncMeta,
        syncOutbox,
        initialized: true,
      };
      return globalForLocalDb.__easyDebtLocalDb;
    }
  } catch (err) {
    console.warn("[EasyDebt LocalDB] Failed to load existing local DB file, initializing fresh store:", err);
  }

  const initialStore = createDemoMockStore();
  const initialState: GlobalLocalDbState = {
    store: initialStore,
    syncMeta: {
      ...DEFAULT_SYNC_META,
      lastSyncedAt: new Date().toISOString(),
    },
    syncOutbox: [],
    initialized: true,
  };

  globalForLocalDb.__easyDebtLocalDb = initialState;
  persistLocalDbToDisk();
  return initialState;
}

export function persistLocalDbToDisk(): void {
  const state = globalForLocalDb.__easyDebtLocalDb;
  if (!state) return;

  try {
    const filePath = resolveLocalDbFilePath();
    const serialized = serializeStore(state.store, state.syncMeta, state.syncOutbox);
    fs.writeFileSync(/*turbopackIgnore: true*/ filePath, JSON.stringify(serialized, null, 2), "utf-8");
  } catch (err) {
    console.error("[EasyDebt LocalDB] Failed to persist local DB to disk:", err);
  }
}

export function getPersistentLocalStore(): MockStoreData {
  return ensureInitialized().store;
}

export function getSyncMetadata(): SyncMetadata {
  return ensureInitialized().syncMeta;
}

export function updateSyncMetadata(patch: Partial<SyncMetadata>): SyncMetadata {
  const state = ensureInitialized();
  state.syncMeta = {
    ...state.syncMeta,
    ...patch,
  };
  persistLocalDbToDisk();
  return state.syncMeta;
}

export function getSyncOutbox(): SyncOutboxItem[] {
  return ensureInitialized().syncOutbox;
}

export function recordSyncMutation(input: {
  entityType: SyncEntityType;
  operation: SyncOperation;
  entityId: number;
  externalId: string;
  entityLabel: string;
  payload: Record<string, unknown>;
}): SyncOutboxItem {
  const state = ensureInitialized();
  const item: SyncOutboxItem = {
    id: `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
    entityType: input.entityType,
    operation: input.operation,
    entityId: input.entityId,
    externalId: input.externalId,
    entityLabel: input.entityLabel,
    payload: input.payload,
    status: "PENDING",
    retryCount: 0,
    errorMessage: null,
    createdAt: new Date().toISOString(),
    syncedAt: null,
  };

  state.syncOutbox.unshift(item);
  if (state.syncOutbox.length > 500) {
    state.syncOutbox = state.syncOutbox.slice(0, 500);
  }
  persistLocalDbToDisk();
  return item;
}

export function exportLocalDatabaseSnapshot(): SerializedLocalDatabase {
  const state = ensureInitialized();
  return serializeStore(state.store, state.syncMeta, state.syncOutbox);
}

export function importLocalDatabaseSnapshot(snapshot: SerializedLocalDatabase): void {
  const { store, syncMeta, syncOutbox } = deserializeStore(snapshot);
  globalForLocalDb.__easyDebtLocalDb = {
    store,
    syncMeta,
    syncOutbox,
    initialized: true,
  };
  persistLocalDbToDisk();
}

export function resetPersistentLocalStore(): void {
  const initialStore = createDemoMockStore();
  globalForLocalDb.__easyDebtLocalDb = {
    store: initialStore,
    syncMeta: {
      ...DEFAULT_SYNC_META,
      lastSyncedAt: new Date().toISOString(),
    },
    syncOutbox: [],
    initialized: true,
  };
  persistLocalDbToDisk();
}

export function getLocalDatabaseFilePath(): string {
  return resolveLocalDbFilePath();
}
