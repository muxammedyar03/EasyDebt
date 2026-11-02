# EasyDebt agent notes

- Find the requested module with `rg --files` and read its immediate callers, data model and focused tests. Do not inspect the entire repository for each task. Verify the current `main` SHA before pushing changes.
- Notifications: `src/lib/notifications.ts`, `src/lib/push/`, `src/lib/crons.ts`, `src/lib/hosting-reminder.ts`. Tenant backup: `src/lib/tenant-backup/{tables,service}.ts`. Schema and migrations: `prisma/`. Production: `.github/workflows/deploy.yml`, `Dockerfile`, `docker-compose.prod.yml`.
- Enforce `client_id` at every tenant boundary, including device delivery and import/export. Add new tenant tables to backup export, validation and restore order. Test two-tenant and concurrent-worker paths for changes that touch tenant data or cron jobs.
- Payment's manual rating reset checkbox is an intentional business feature; preserve it.
- For changes, run the relevant Jest tests, `tsc --noEmit`, ESLint on touched files, and the repo's integration script when modifying backup (`node --import tsx scripts/tests/tenant-backup.ts`). Production uses Node 20. Check Docker build and production deploy results after a merge.
- The user authorized feature branches, PR merges into `main`, and production deployment. Follow any newer user direction on pushing. Do not expose credentials in tool output or commits.

<!-- BEGIN:nextjs-agent-rules -->

## This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` (resolved from this file's directory; in monorepos the `next` package may not be visible from the repo root) before writing any code. Heed deprecation notices.

This block is written and re-added by `next dev` — verify at `node_modules/next/dist/server/lib/generate-agent-files.js`. Removing it from a diff only re-creates the uncommitted change; committing it with your work keeps the tree clean.

<!-- END:nextjs-agent-rules -->
