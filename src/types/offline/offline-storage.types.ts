/**
 * Offline Storage & Synchronization Types
 * Layer: types/offline
 */

export interface OfflineDebtItem {
  id: number;
  external_id?: string;
  debtor_id: number;
  amount: number;
  description: string | null;
  created_at: string;
}

export interface OfflinePaymentItem {
  id: number;
  external_id?: string;
  debtor_id: number;
  amount: number;
  payment_type: "CASH" | "CARD" | "CLICK" | string;
  note: string | null;
  resets_rating?: boolean;
  created_at: string;
}

export interface OfflineDebtorItem {
  id: number;
  external_id: string;
  first_name: string;
  last_name: string;
  phone_number: string | null;
  address: string | null;
  total_debt: number;
  is_overdue: boolean;
  created_at: string;
  updated_at: string;
  debts: OfflineDebtItem[];
  payments: OfflinePaymentItem[];
}

export type OfflineMutationType = "debtor" | "debt" | "payment";

export interface OfflineOutboxAction {
  id: string;
  type: OfflineMutationType;
  payload: Record<string, unknown>;
  label: string;
  createdAt: string;
  retryCount: number;
}

export interface OfflineSyncMetadata {
  lastSyncedAt: string | null;
  totalDebtors: number;
  isSyncing: boolean;
  lastError: string | null;
}
