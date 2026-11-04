/**
 * Offline Sync Service
 * Layer: lib/services
 *
 * Coordinates synchronization between PostgreSQL (Cloud) and IndexedDB (Local).
 * Handles:
 * - Full debtor dataset hydration into IndexedDB when online
 * - Offline outbox queue flushing when connection restores
 * - Optimistic local state updates for offline debts and payments
 */

import { debtorOfflineRepository } from "@/entities/debtor/api/debtor-offline.repository";
import type { OfflineDebtorItem, OfflineDebtItem, OfflinePaymentItem, OfflineOutboxAction } from "@/types/offline";

interface RawDebtPayload {
  id?: number | string;
  external_id?: string | null;
  debtor_id?: number | string;
  amount?: number | string;
  description?: string | null;
  created_at?: string;
}

interface RawPaymentPayload {
  id?: number | string;
  external_id?: string | null;
  debtor_id?: number | string;
  amount?: number | string;
  payment_type?: string | null;
  note?: string | null;
  resets_rating?: boolean;
  created_at?: string;
}

interface RawDebtorPayload {
  id?: number | string;
  external_id?: string | null;
  first_name?: string;
  last_name?: string;
  phone_number?: string | null;
  address?: string | null;
  total_debt?: number | string;
  is_overdue?: boolean;
  created_at?: string;
  updated_at?: string;
  debts?: RawDebtPayload[];
  payments?: RawPaymentPayload[];
}

class OfflineSyncService {
  private isSyncing = false;

  /**
   * Hydrates local IndexedDB with complete debtors, debts, and payments from cloud
   */
  async syncCloudToOffline(): Promise<{ success: boolean; count: number; error?: string }> {
    if (typeof window === "undefined" || !navigator.onLine || this.isSyncing) {
      return { success: false, count: 0 };
    }

    this.isSyncing = true;
    try {
      const res = await fetch("/api/debtors", {
        headers: { Accept: "application/json" },
        cache: "no-store",
      });

      if (!res.ok) {
        throw new Error(`Cloud fetch failed with status ${res.status}`);
      }

      const debtorsRaw = (await res.json()) as RawDebtorPayload[];
      if (!Array.isArray(debtorsRaw)) {
        throw new Error("Invalid response format from /api/debtors");
      }

      const formatted: OfflineDebtorItem[] = debtorsRaw.map((d: RawDebtorPayload) => ({
        id: Number(d.id),
        external_id: String(d.external_id || d.id),
        first_name: String(d.first_name || ""),
        last_name: String(d.last_name || ""),
        phone_number: d.phone_number ? String(d.phone_number) : null,
        address: d.address ? String(d.address) : null,
        total_debt: Number(d.total_debt || 0),
        is_overdue: Boolean(d.is_overdue),
        created_at: String(d.created_at || new Date().toISOString()),
        updated_at: String(d.updated_at || new Date().toISOString()),
        debts: Array.isArray(d.debts)
          ? d.debts.map((debt: RawDebtPayload) => ({
              id: Number(debt.id),
              external_id: debt.external_id ? String(debt.external_id) : undefined,
              debtor_id: Number(debt.debtor_id),
              amount: Number(debt.amount || 0),
              description: debt.description ? String(debt.description) : null,
              created_at: String(debt.created_at || new Date().toISOString()),
            }))
          : [],
        payments: Array.isArray(d.payments)
          ? d.payments.map((p: RawPaymentPayload) => ({
              id: Number(p.id),
              external_id: p.external_id ? String(p.external_id) : undefined,
              debtor_id: Number(p.debtor_id),
              amount: Number(p.amount || 0),
              payment_type: String(p.payment_type || "CASH"),
              note: p.note ? String(p.note) : null,
              resets_rating: Boolean(p.resets_rating),
              created_at: String(p.created_at || new Date().toISOString()),
            }))
          : [],
      }));

      await debtorOfflineRepository.saveAllDebtors(formatted);
      return { success: true, count: formatted.length };
    } catch (err) {
      console.warn("[OfflineSyncService] Cloud hydration warning:", err);
      return { success: false, count: 0, error: String(err) };
    } finally {
      this.isSyncing = false;
    }
  }

  /**
   * Flushes queued offline mutations (debts, payments, debtors) to server
   */
  async flushOutboxToServer(): Promise<{ synced: number; failed: number }> {
    if (typeof window === "undefined" || !navigator.onLine) {
      return { synced: 0, failed: 0 };
    }

    const actions = await debtorOfflineRepository.getAllOutboxActions();
    if (actions.length === 0) return { synced: 0, failed: 0 };

    let synced = 0;
    let failed = 0;

    for (const action of actions) {
      try {
        let endpoint = "/api/debts";
        if (action.type === "debtor") endpoint = "/api/debtors";
        else if (action.type === "payment") endpoint = "/api/payments";

        const res = await fetch(endpoint, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(action.payload),
        });

        if (res.ok) {
          await debtorOfflineRepository.removeOutboxAction(action.id);
          synced++;
        } else {
          action.retryCount = (action.retryCount || 0) + 1;
          await debtorOfflineRepository.saveOutboxAction(action);
          failed++;
        }
      } catch {
        action.retryCount = (action.retryCount || 0) + 1;
        await debtorOfflineRepository.saveOutboxAction(action);
        failed++;
      }
    }

    // Refresh cloud data after syncing outbox
    if (synced > 0) {
      void this.syncCloudToOffline();
    }

    return { synced, failed };
  }

  /**
   * Optimistically records an offline action and updates local debtor data
   */
  async recordOfflineAction(
    type: "debtor" | "debt" | "payment",
    payload: Record<string, unknown>,
    label: string,
  ): Promise<OfflineOutboxAction> {
    const action: OfflineOutboxAction = {
      id: `outbox_${Date.now()}_${Math.random().toString(36).substring(2, 8)}`,
      type,
      payload,
      label,
      createdAt: new Date().toISOString(),
      retryCount: 0,
    };

    await debtorOfflineRepository.saveOutboxAction(action);

    // Optimistic local updates in IndexedDB
    if (type === "debt" && payload.debtor_id) {
      const debtItem: OfflineDebtItem = {
        id: Date.now(),
        debtor_id: Number(payload.debtor_id),
        amount: Number(payload.amount || 0),
        description: payload.description ? String(payload.description) : null,
        created_at: new Date().toISOString(),
      };
      await debtorOfflineRepository.addLocalDebt(debtItem.debtor_id, debtItem);
    } else if (type === "payment" && payload.debtor_id) {
      const paymentItem: OfflinePaymentItem = {
        id: Date.now(),
        debtor_id: Number(payload.debtor_id),
        amount: Number(payload.amount || 0),
        payment_type: String(payload.payment_type || "CASH"),
        note: payload.note ? String(payload.note) : null,
        resets_rating: Boolean(payload.resets_rating),
        created_at: new Date().toISOString(),
      };
      await debtorOfflineRepository.addLocalPayment(paymentItem.debtor_id, paymentItem);
    }

    return action;
  }
}

export const offlineSyncService = new OfflineSyncService();
