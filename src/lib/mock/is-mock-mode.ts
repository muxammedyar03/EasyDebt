import { cookies } from "next/headers";

export const GUEST_SESSION_COOKIE = "guest-demo-session";

/** Env-based mock flag (module init / client-safe). */
export function isMockMode(): boolean {
  return process.env.USE_MOCK_DATA === "true" || process.env.NEXT_PUBLIC_USE_MOCK_DATA === "true";
}

export function isGuestDemoSession(cookieValue?: string | null): boolean {
  return cookieValue === "1";
}

/** Server: env mock OR active guest-demo cookie. */
export async function shouldUseMockData(): Promise<boolean> {
  if (isMockMode()) return true;

  try {
    const cookieStore = await cookies();
    return isGuestDemoSession(cookieStore.get(GUEST_SESSION_COOKIE)?.value);
  } catch {
    return false;
  }
}
