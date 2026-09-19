/**
 * Next.js Instrumentation
 *
 * This file runs once when the Next.js server starts.
 * Can be used for server-side initialization.
 *
 * Cron jobs are handled via Linux crontab calling API endpoints.
 *
 * @see https://nextjs.org/docs/app/building-your-application/optimizing/instrumentation
 */

export async function register() {
  if (process.env.NEXT_RUNTIME === "nodejs") {
    const { getJwtKey, getShareKey } = await import("./lib/security/secrets");
    getJwtKey();
    await getShareKey();
    console.log("[instrumentation] Server started");
  }
}
