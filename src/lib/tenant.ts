import type { JWTPayload } from "@/lib/auth";

export class TenantError extends Error {
  status: number;

  constructor(message = "Client context required", status = 403) {
    super(message);
    this.name = "TenantError";
    this.status = status;
  }
}

/** Prisma where fragment for the current tenant */
export function tenantWhere(session: JWTPayload) {
  return { client_id: requireClientId(session) };
}

export function requireClientId(session: JWTPayload | null | undefined): number {
  if (!session?.clientId || typeof session.clientId !== "number") {
    throw new TenantError();
  }
  return session.clientId;
}

export function clientCreateData(session: JWTPayload) {
  return { client_id: requireClientId(session) };
}
