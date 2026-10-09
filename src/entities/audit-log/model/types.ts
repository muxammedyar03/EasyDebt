export type AuditActorRole = "SUPER_ADMIN" | "ADMIN" | "USER";

export interface RecentAuditActor {
  id: number;
  username: string;
  displayName: string;
  role: AuditActorRole;
}

/** Browser-safe read model used only by the dashboard's recent-actions widget. */
export interface RecentAuditAction {
  id: number;
  action: string;
  entityType: string;
  createdAt: string;
  amount: number | null;
  subjectName: string | null;
  subjectHref: string | null;
  actor: RecentAuditActor | null;
  canUndo: boolean;
  canCancel: boolean;
}

export interface RecentAuditActionsResponse {
  actions: RecentAuditAction[];
}
