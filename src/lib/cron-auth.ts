import { NextRequest, NextResponse } from "next/server";

/**
 * Cron API himoyasi
 *
 * API key orqali tekshiradi:
 * - Header: Authorization: Bearer <CRON_SECRET>
 * - Query: ?key=<CRON_SECRET>
 *
 * Environment variable: CRON_SECRET
 */
export function verifyCronAuth(request: NextRequest): { authorized: boolean; error?: NextResponse } {
  const cronSecret = process.env.CRON_SECRET;

  // Agar CRON_SECRET sozlanmagan bo'lsa, xatolik qaytarish
  if (!cronSecret) {
    console.error("[cron-auth] CRON_SECRET environment variable is not set");
    return {
      authorized: false,
      error: NextResponse.json({ error: "Server configuration error" }, { status: 500 }),
    };
  }

  // Authorization header tekshirish
  const authHeader = request.headers.get("authorization");
  if (authHeader) {
    const token = authHeader.replace("Bearer ", "");
    if (token === cronSecret) {
      return { authorized: true };
    }
  }

  // Query parameter tekshirish (?key=...)
  const keyParam = request.nextUrl.searchParams.get("key");
  if (keyParam === cronSecret) {
    return { authorized: true };
  }

  // Ruxsat berilmadi
  return {
    authorized: false,
    error: NextResponse.json({ error: "Unauthorized - Invalid or missing CRON_SECRET" }, { status: 401 }),
  };
}
