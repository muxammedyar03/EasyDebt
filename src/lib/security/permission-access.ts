import type { JWTPayload } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import {
  effectivePermission,
  isPermissionKey,
  permissionParentKey,
  PERMISSION_KEYS,
  type PermissionKey,
} from "./permission-catalog";

/** Read current grants on each protected request so revocation takes effect without re-login. */
export async function hasPermission(session: JWTPayload | null, key: PermissionKey): Promise<boolean> {
  if (!session || !isPermissionKey(key)) return false;
  const parent = permissionParentKey(key);
  if (parent && !(await hasPermission(session, parent))) return false;
  const [platform, client, user] = await Promise.all([
    prisma.platformPermission.findUnique({ where: { key }, select: { enabled: true } }),
    prisma.clientPermission.findUnique({
      where: { client_id_key: { client_id: session.clientId, key } },
      select: { enabled: true },
    }),
    prisma.userPermission.findUnique({
      where: { user_id_key: { user_id: session.userId, key } },
      select: { enabled: true, client_id: true },
    }),
  ]);
  return effectivePermission(
    session.role,
    key,
    platform?.enabled,
    client?.enabled,
    user?.client_id === session.clientId ? user.enabled : undefined,
  );
}

export async function requirePermission(session: JWTPayload | null, key: PermissionKey): Promise<void> {
  if (!(await hasPermission(session, key))) {
    throw new PermissionDenied();
  }
}

export async function getEffectivePermissionKeys(session: JWTPayload | null): Promise<PermissionKey[]> {
  if (!session) return [];
  const [platform, client, user] = await Promise.all([
    prisma.platformPermission.findMany({ select: { key: true, enabled: true } }),
    prisma.clientPermission.findMany({ where: { client_id: session.clientId }, select: { key: true, enabled: true } }),
    prisma.userPermission.findMany({
      where: { client_id: session.clientId, user_id: session.userId },
      select: { key: true, enabled: true },
    }),
  ]);
  const p = new Map(platform.map(({ key, enabled }) => [key, enabled]));
  const c = new Map(client.map(({ key, enabled }) => [key, enabled]));
  const u = new Map(user.map(({ key, enabled }) => [key, enabled]));
  return PERMISSION_KEYS.filter((key) => {
    const parent = permissionParentKey(key);
    return (
      (!parent || effectivePermission(session.role, parent, p.get(parent), c.get(parent), u.get(parent))) &&
      effectivePermission(session.role, key, p.get(key), c.get(key), u.get(key))
    );
  });
}

export class PermissionDenied extends Error {
  readonly status = 403;
  constructor() {
    super("Ruxsat yo‘q");
  }
}
