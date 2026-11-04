/**
 * Debtor Offline Repository (IndexedDB Engine)
 * Layer: entities/debtor/api
 *
 * Provides typed, zero-dependency, asynchronous persistence using browser's
 * native IndexedDB. Safely handles transactions, index searches, and optimistic updates.
 */

import type {
  OfflineDebtorItem,
  OfflineDebtItem,
  OfflinePaymentItem,
  OfflineOutboxAction,
  OfflineSyncMetadata,
} from "@/types/offline";

const DB_NAME = "easydebt_offline_db_v2";
const DB_VERSION = 1;

const STORES = {
  DEBTORS: "debtors",
  OUTBOX: "outbox",
  METADATA: "metadata",
} as const;

class DebtorOfflineRepository {
  private dbPromise: Promise<IDBDatabase> | null = null;

  private getDB(): Promise<IDBDatabase> {
    if (typeof window === "undefined" || !("indexedDB" in window)) {
      return Promise.reject(new Error("IndexedDB is not supported in this environment"));
    }

    if (!this.dbPromise) {
      this.dbPromise = new Promise((resolve, reject) => {
        const request = window.indexedDB.open(DB_NAME, DB_VERSION);

        request.onupgradeneeded = (event) => {
          const db = (event.target as IDBOpenDBRequest).result;

          // Debtors store
          if (!db.objectStoreNames.contains(STORES.DEBTORS)) {
            const debtorStore = db.createObjectStore(STORES.DEBTORS, { keyPath: "id" });
            debtorStore.createIndex("external_id", "external_id", { unique: true });
            debtorStore.createIndex("name", ["first_name", "last_name"], { unique: false });
          }

          // Outbox store
          if (!db.objectStoreNames.contains(STORES.OUTBOX)) {
            db.createObjectStore(STORES.OUTBOX, { keyPath: "id" });
          }

          // Metadata store
          if (!db.objectStoreNames.contains(STORES.METADATA)) {
            db.createObjectStore(STORES.METADATA, { keyPath: "key" });
          }
        };

        request.onsuccess = () => resolve(request.result);
        request.onerror = () => reject(request.error);
      });
    }

    return this.dbPromise;
  }

  // --- Debtors Store Methods ---

  async saveAllDebtors(debtors: OfflineDebtorItem[]): Promise<void> {
    const db = await this.getDB();
    return new Promise((resolve, reject) => {
      const tx = db.transaction([STORES.DEBTORS, STORES.METADATA], "readwrite");
      const debtorStore = tx.objectStore(STORES.DEBTORS);
      const metaStore = tx.objectStore(STORES.METADATA);

      // Clear existing records and replace with fresh snapshot
      debtorStore.clear();
      for (const d of debtors) {
        debtorStore.put(d);
      }

      metaStore.put({
        key: "sync_meta",
        lastSyncedAt: new Date().toISOString(),
        totalDebtors: debtors.length,
        isSyncing: false,
        lastError: null,
      });

      tx.oncomplete = () => {
        this.notifyChange("debtors-updated", debtors.length);
        resolve();
      };
      tx.onerror = () => reject(tx.error);
    });
  }

  async getAllDebtors(): Promise<OfflineDebtorItem[]> {
    const db = await this.getDB();
    return new Promise((resolve, reject) => {
      const tx = db.transaction(STORES.DEBTORS, "readonly");
      const store = tx.objectStore(STORES.DEBTORS);
      const req = store.getAll();

      req.onsuccess = () => resolve(req.result || []);
      req.onerror = () => reject(req.error);
    });
  }

  async getDebtorByExternalId(externalId: string): Promise<OfflineDebtorItem | null> {
    const db = await this.getDB();
    return new Promise((resolve, reject) => {
      const tx = db.transaction(STORES.DEBTORS, "readonly");
      const store = tx.objectStore(STORES.DEBTORS);
      const index = store.index("external_id");
      const req = index.get(externalId);

      req.onsuccess = () => resolve(req.result || null);
      req.onerror = () => reject(req.error);
    });
  }

  async getDebtorById(id: number): Promise<OfflineDebtorItem | null> {
    const db = await this.getDB();
    return new Promise((resolve, reject) => {
      const tx = db.transaction(STORES.DEBTORS, "readonly");
      const store = tx.objectStore(STORES.DEBTORS);
      const req = store.get(id);

      req.onsuccess = () => resolve(req.result || null);
      req.onerror = () => reject(req.error);
    });
  }

  async upsertDebtor(debtor: OfflineDebtorItem): Promise<void> {
    const db = await this.getDB();
    return new Promise((resolve, reject) => {
      const tx = db.transaction(STORES.DEBTORS, "readwrite");
      const store = tx.objectStore(STORES.DEBTORS);
      store.put(debtor);

      tx.oncomplete = () => {
        this.notifyChange("debtors-updated", 1);
        resolve();
      };
      tx.onerror = () => reject(tx.error);
    });
  }

  async addLocalDebt(debtorId: number, debt: OfflineDebtItem): Promise<void> {
    const debtor = await this.getDebtorById(debtorId);
    if (!debtor) return;

    debtor.debts = [debt, ...(debtor.debts || [])];
    debtor.total_debt = (debtor.total_debt || 0) + debt.amount;
    debtor.updated_at = new Date().toISOString();

    await this.upsertDebtor(debtor);
  }

  async addLocalPayment(debtorId: number, payment: OfflinePaymentItem): Promise<void> {
    const debtor = await this.getDebtorById(debtorId);
    if (!debtor) return;

    debtor.payments = [payment, ...(debtor.payments || [])];
    debtor.total_debt = Math.max(0, (debtor.total_debt || 0) - payment.amount);
    debtor.updated_at = new Date().toISOString();

    await this.upsertDebtor(debtor);
  }

  // --- Outbox Store Methods ---

  async saveOutboxAction(action: OfflineOutboxAction): Promise<void> {
    const db = await this.getDB();
    return new Promise((resolve, reject) => {
      const tx = db.transaction(STORES.OUTBOX, "readwrite");
      const store = tx.objectStore(STORES.OUTBOX);
      store.put(action);

      tx.oncomplete = () => {
        this.notifyChange("outbox-updated", 1);
        resolve();
      };
      tx.onerror = () => reject(tx.error);
    });
  }

  async getAllOutboxActions(): Promise<OfflineOutboxAction[]> {
    const db = await this.getDB();
    return new Promise((resolve, reject) => {
      const tx = db.transaction(STORES.OUTBOX, "readonly");
      const store = tx.objectStore(STORES.OUTBOX);
      const req = store.getAll();

      req.onsuccess = () => resolve(req.result || []);
      req.onerror = () => reject(req.error);
    });
  }

  async removeOutboxAction(id: string): Promise<void> {
    const db = await this.getDB();
    return new Promise((resolve, reject) => {
      const tx = db.transaction(STORES.OUTBOX, "readwrite");
      const store = tx.objectStore(STORES.OUTBOX);
      store.delete(id);

      tx.oncomplete = () => {
        this.notifyChange("outbox-updated", -1);
        resolve();
      };
      tx.onerror = () => reject(tx.error);
    });
  }

  async getOutboxCount(): Promise<number> {
    const db = await this.getDB();
    return new Promise((resolve, reject) => {
      const tx = db.transaction(STORES.OUTBOX, "readonly");
      const store = tx.objectStore(STORES.OUTBOX);
      const req = store.count();

      req.onsuccess = () => resolve(req.result || 0);
      req.onerror = () => reject(req.error);
    });
  }

  // --- Metadata Store Methods ---

  async getMetadata(): Promise<OfflineSyncMetadata> {
    try {
      const db = await this.getDB();
      return new Promise((resolve) => {
        const tx = db.transaction(STORES.METADATA, "readonly");
        const store = tx.objectStore(STORES.METADATA);
        const req = store.get("sync_meta");

        req.onsuccess = () => {
          resolve(
            req.result || {
              lastSyncedAt: null,
              totalDebtors: 0,
              isSyncing: false,
              lastError: null,
            },
          );
        };
        req.onerror = () => {
          resolve({
            lastSyncedAt: null,
            totalDebtors: 0,
            isSyncing: false,
            lastError: null,
          });
        };
      });
    } catch {
      return {
        lastSyncedAt: null,
        totalDebtors: 0,
        isSyncing: false,
        lastError: null,
      };
    }
  }

  async setMetadata(meta: Partial<OfflineSyncMetadata>): Promise<void> {
    const current = await this.getMetadata();
    const updated = { ...current, ...meta, key: "sync_meta" };

    const db = await this.getDB();
    return new Promise((resolve, reject) => {
      const tx = db.transaction(STORES.METADATA, "readwrite");
      const store = tx.objectStore(STORES.METADATA);
      store.put(updated);

      tx.oncomplete = () => resolve();
      tx.onerror = () => reject(tx.error);
    });
  }

  private notifyChange(type: "debtors-updated" | "outbox-updated", detail: number): void {
    if (typeof window !== "undefined") {
      window.dispatchEvent(new CustomEvent(`easydebt:${type}`, { detail }));
    }
  }
}

export const debtorOfflineRepository = new DebtorOfflineRepository();
