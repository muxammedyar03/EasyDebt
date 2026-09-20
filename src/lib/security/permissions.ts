import type { JWTPayload } from "@/lib/auth";

export type Permission = "settings.manage" | "records.delete" | "tenant.backup";
const grants: Record<string, readonly Permission[]> = {
  USER: [],
  ADMIN: ["settings.manage", "records.delete"],
  SUPER_ADMIN: ["settings.manage", "records.delete", "tenant.backup"],
};
export function can(session: JWTPayload | null, permission: Permission): boolean {
  return Boolean(session && grants[session.role]?.includes(permission));
}
