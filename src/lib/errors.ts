/**
 * Centralized error message helpers for API and client.
 * Use these instead of inline error strings for consistency.
 */

/** Default message for API 500 responses (safe, no internal leak) */
export const API_ERROR_MESSAGE = "Serverda xatolik yuz berdi";

/**
 * Get a safe error message for API JSON responses (500).
 * Always returns a generic message to avoid leaking internal details.
 * Use in catch blocks: return NextResponse.json({ error: getApiErrorMessage(error) }, { status: 500 })
 */
export function getApiErrorMessage(_error: unknown): string {
  return API_ERROR_MESSAGE;
}

/**
 * Get user-facing error message on the client (e.g. for toast).
 * Prefer parsing API response body first; use this when handling thrown errors or fetch failures.
 */
export function getErrorMessage(error: unknown, fallback: string): string {
  if (error instanceof Error && error.message) {
    return error.message;
  }
  if (typeof error === "string") {
    return error;
  }
  return fallback;
}
