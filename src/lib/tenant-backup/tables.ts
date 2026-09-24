/** Explicit inventory: adding a tenant model requires updating backup coverage. */
export const TENANT_BACKUP_TABLES = [
  "users",
  "settings",
  "debtors",
  "companies",
  "debts",
  "payments",
  "payment_reminders",
  "company_debts",
  "company_payments",
  "company_daily_snapshots",
  "notifications",
  "audit_logs",
  "import_history",
  "push_subscriptions",
  "user_push_preferences",
  "push_deliveries",
] as const;
export type BackupTable = (typeof TENANT_BACKUP_TABLES)[number];
export const USER_SCOPED = new Set<BackupTable>(["push_subscriptions", "user_push_preferences"]);
export const APPEND_ONLY = new Set<BackupTable>(["audit_logs", "import_history"]);
export const MONEY_COLUMNS: Partial<Record<BackupTable, string[]>> = {
  debtors: ["total_debt"],
  companies: ["total_debt"],
  debts: ["amount"],
  payments: ["amount"],
  company_debts: ["amount"],
  company_payments: ["amount"],
  company_daily_snapshots: ["total_outstanding_debt", "debts_sum", "payments_sum"],
};
