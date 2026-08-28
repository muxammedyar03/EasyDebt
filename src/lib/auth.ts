import { SignJWT, jwtVerify } from "jose";
import { cookies } from "next/headers";

import { prisma } from "@/lib/prisma";

const JWT_SECRET = new TextEncoder().encode(process.env.JWT_SECRET || "your-secret-key-change-this-in-production");

export interface JWTPayload {
  userId: number;
  username: string;
  email?: string | null;
  role: string;
  clientId: number;
}

export async function signToken(payload: JWTPayload): Promise<string> {
  return await new SignJWT({ ...payload })
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setExpirationTime("7d") // Token expires in 7 days
    .sign(JWT_SECRET);
}

function isBasePayload(payload: Record<string, unknown>): boolean {
  return typeof payload.userId === "number" && typeof payload.username === "string" && typeof payload.role === "string";
}

export async function verifyToken(token: string): Promise<JWTPayload | null> {
  try {
    const { payload } = await jwtVerify(token, JWT_SECRET);
    const data = payload as Record<string, unknown>;

    if (!isBasePayload(data)) {
      console.error("Invalid token payload structure");
      return null;
    }

    if (typeof data.clientId === "number") {
      return data as unknown as JWTPayload;
    }

    // Legacy tokens (pre multi-tenant): hydrate clientId from DB
    const user = await prisma.user.findUnique({
      where: { id: data.userId as number },
      select: { client_id: true, is_active: true },
    });

    if (!user?.is_active || user.client_id == null) {
      return null;
    }

    return {
      userId: data.userId as number,
      username: data.username as string,
      email: (data.email as string | null | undefined) ?? null,
      role: data.role as string,
      clientId: user.client_id,
    };
  } catch (error) {
    console.error("Token verification failed:", error);
    return null;
  }
}

export async function getSession(): Promise<JWTPayload | null> {
  const cookieStore = await cookies();
  const token = cookieStore.get("auth-token")?.value;

  if (!token) {
    return null;
  }

  const session = await verifyToken(token);
  if (!session) {
    return null;
  }

  // Re-issue cookie if legacy token lacked clientId (only works in Route Handlers / Server Actions)
  try {
    const { payload } = await jwtVerify(token, JWT_SECRET);
    if (typeof (payload as Record<string, unknown>).clientId !== "number") {
      const fresh = await signToken(session);
      await setAuthCookie(fresh);
    }
  } catch {
    // Cookie may be read-only in RSC — hydrated session is still valid
  }

  return session;
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
