import { SignJWT, jwtVerify } from "jose";
import { cookies } from "next/headers";
import { NextResponse } from "next/server";

import { GUEST_SESSION_COOKIE } from "@/lib/mock/is-mock-mode";

const JWT_SECRET = new TextEncoder().encode(process.env.JWT_SECRET || "your-secret-key-change-this-in-production");

const AUTH_COOKIE_OPTIONS = {
  httpOnly: true,
  secure: process.env.NODE_ENV === "production",
  sameSite: "lax" as const,
  maxAge: 60 * 60 * 24 * 7,
  path: "/",
};

export interface JWTPayload {
  userId: number;
  username: string;
  email?: string | null;
  role: string;
}

export async function signToken(payload: JWTPayload): Promise<string> {
  return await new SignJWT({ ...payload })
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setExpirationTime("7d")
    .sign(JWT_SECRET);
}

export async function verifyToken(token: string): Promise<JWTPayload | null> {
  try {
    const { payload } = await jwtVerify(token, JWT_SECRET);

    if (
      typeof payload.userId === "number" &&
      typeof payload.username === "string" &&
      typeof payload.role === "string"
    ) {
      return payload as unknown as JWTPayload;
    }

    console.error("Invalid token payload structure");
    return null;
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

  return await verifyToken(token);
}

export function applyAuthCookie(response: NextResponse, token: string): NextResponse {
  response.cookies.set("auth-token", token, AUTH_COOKIE_OPTIONS);
  return response;
}

export function applyGuestDemoCookie(response: NextResponse): NextResponse {
  response.cookies.set(GUEST_SESSION_COOKIE, "1", AUTH_COOKIE_OPTIONS);
  return response;
}

export function clearAuthCookies(response: NextResponse): NextResponse {
  response.cookies.set("auth-token", "", { ...AUTH_COOKIE_OPTIONS, maxAge: 0 });
  response.cookies.set(GUEST_SESSION_COOKIE, "", { ...AUTH_COOKIE_OPTIONS, maxAge: 0 });
  return response;
}

export function clearGuestDemoCookieOnResponse(response: NextResponse): NextResponse {
  response.cookies.set(GUEST_SESSION_COOKIE, "", { ...AUTH_COOKIE_OPTIONS, maxAge: 0 });
  return response;
}

/** @deprecated Prefer applyAuthCookie on NextResponse in route handlers */
export async function setAuthCookie(token: string) {
  const cookieStore = await cookies();
  cookieStore.set("auth-token", token, AUTH_COOKIE_OPTIONS);
}

/** @deprecated Prefer clearAuthCookies on NextResponse in route handlers */
export async function clearAuthCookie() {
  const cookieStore = await cookies();
  cookieStore.delete("auth-token");
}

/** @deprecated Prefer applyGuestDemoCookie on NextResponse in route handlers */
export async function setGuestDemoCookie() {
  const cookieStore = await cookies();
  cookieStore.set(GUEST_SESSION_COOKIE, "1", AUTH_COOKIE_OPTIONS);
}

/** @deprecated Prefer clearGuestDemoCookieOnResponse on NextResponse in route handlers */
export async function clearGuestDemoCookie() {
  const cookieStore = await cookies();
  cookieStore.delete(GUEST_SESSION_COOKIE);
}
