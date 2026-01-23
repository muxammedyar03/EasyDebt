/**
 * Next.js Instrumentation
 *
 * This file runs once when the Next.js server starts.
 * Used to initialize cron jobs for VPS deployments.
 *
 * @see https://nextjs.org/docs/app/building-your-application/optimizing/instrumentation
 */

export async function register() {
  // Only run cron scheduler on server side in production
  if (process.env.NEXT_RUNTIME === "nodejs") {
    // Start cron scheduler for VPS deployments
    // Comment out this block if using external cron (Linux crontab, Vercel Cron, etc.)
    const { startCronScheduler } = await import("./lib/crons");
    startCronScheduler();
  }
}
