"use server";

import { cookies } from "next/headers";
import { validatePreferenceCookie } from "@/lib/security/preference-cookie";

// export async function getValueFromCookie(key: string): Promise<string | undefined> {
//   const cookieStore = await cookies();
//   return cookieStore.get(key)?.value;
// }

export async function setValueToCookie(
  key: string,
  value: string,
  options: { path?: string; maxAge?: number } = {},
): Promise<void> {
  const safeOptions = validatePreferenceCookie(key, value, options);
  const cookieStore = await cookies();
  cookieStore.set(key, value, safeOptions);
}

export async function getPreference<T extends string>(key: string, allowed: readonly T[], fallback: T): Promise<T> {
  const cookieStore = await cookies();
  const cookie = cookieStore.get(key);
  const value = cookie ? cookie.value.trim() : undefined;
  return allowed.includes(value as T) ? (value as T) : fallback;
}

import { getSession } from "@/lib/auth";
import { requirePermission } from "@/lib/security/permission-access";
import { signShareToken } from "@/lib/share-token";
import { prisma } from "@/lib/prisma";
import { requireClientId } from "@/lib/tenant";
import { z } from "zod";

export async function generateShareTokenAction(externalId: string): Promise<string> {
  const session = await getSession();
  if (!session) {
    throw new Error("Unauthorized");
  }
  await requirePermission(session, "debtors.share");
  const id = z.string().uuid().parse(externalId);
  const clientId = requireClientId(session);
  const debtor = await prisma.debtor.findFirst({
    where: { external_id: id, client_id: clientId, client: { is_active: true } },
    select: { id: true },
  });
  if (!debtor) throw new Error("Debtor not found");
  return await signShareToken(id, clientId, session.userId);
}
