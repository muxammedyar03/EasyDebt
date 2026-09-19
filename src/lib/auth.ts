import { SignJWT, jwtVerify } from "jose";
import { cookies } from "next/headers";

import { prisma } from "@/lib/prisma";

import { createHmac } from "crypto";
import { getJwtKey } from "@/lib/security/secrets";

const authUserSelect = {
  id: true,
  username: true,
  email: true,
  role: true,
  password: true,
  client_id: true,
  is_active: true,
  updated_at: true,
  client: { select: { is_active: true } },
} as const;

function authState(user: { password: string; role: string; client_id: number; updated_at: Date }) {
  return createHmac("sha256", getJwtKey())
    .update(JSON.stringify([user.password, user.role, user.client_id, user.updated_at.toISOString()]))
    .digest("hex");
}

export interface JWTPayload {
  userId: number;
  username: string;
  email?: string | null;
  role: string;
  clientId: number;
}

export async function signToken(payload: JWTPayload): Promise<string> {
  const user = await prisma.user.findUnique({ where: { id: payload.userId }, select: authUserSelect });
  if (!user?.is_active || !user.client.is_active) throw new Error("Account unavailable");
  if (user.role !== "SUPER_ADMIN" && payload.clientId !== user.client_id) throw new Error("Forbidden tenant");
  const tenant = await prisma.client.findFirst({
    where: { id: payload.clientId, is_active: true },
    select: { id: true },
  });
  if (!tenant) throw new Error("Tenant unavailable");
  return new SignJWT({
    userId: user.id,
    username: user.username,
    email: user.email,
    role: user.role,
    clientId: tenant.id,
    authState: authState(user),
  })
    .setProtectedHeader({ alg: "HS256" })
    .setAudience("easydebt-session")
    .setIssuedAt()
    .setExpirationTime("7d")
    .sign(getJwtKey());
}

export async function verifyToken(token: string): Promise<JWTPayload | null> {
  try {
    const { payload } = await jwtVerify(token, getJwtKey(), { algorithms: ["HS256"], audience: "easydebt-session" });
    if (
      !Number.isSafeInteger(payload.userId) ||
      !Number.isSafeInteger(payload.clientId) ||
      Number(payload.userId) <= 0 ||
      Number(payload.clientId) <= 0 ||
      typeof payload.authState !== "string"
    )
      return null;
    const user = await prisma.user.findUnique({ where: { id: payload.userId as number }, select: authUserSelect });
    if (!user?.is_active || !user.client.is_active || authState(user) !== payload.authState) return null;
    if (user.role !== "SUPER_ADMIN" && payload.clientId !== user.client_id) return null;
    const tenant = await prisma.client.findFirst({
      where: { id: payload.clientId as number, is_active: true },
      select: { id: true },
    });
    if (!tenant) return null;
    return { userId: user.id, username: user.username, email: user.email, role: user.role, clientId: tenant.id };
  } catch {
    // Malformed/expired tokens and DB failures fail closed, without logging tokens.
    return null;
  }
}

export async function getSession(): Promise<JWTPayload | null> {
  const token = (await cookies()).get("auth-token")?.value;
  return token ? verifyToken(token) : null;
}

export async function setAuthCookie(token: string) {
  const cookieStore = await cookies();
  cookieStore.set("auth-token", token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    maxAge: 60 * 60 * 24 * 7, // 7 days
    path: "/",
  });
}

export async function clearAuthCookie() {
  const cookieStore = await cookies();
  cookieStore.delete("auth-token");
}
