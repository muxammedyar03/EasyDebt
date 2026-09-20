# Security and tenant backup release

Merge branches in order using merge commits (avoid squash/rebase for this stacked series):
1. fix/security-tenant-hardening — TEN-01, SEC-02 through SEC-06. SEC-01 is already on main.
2. fix/payment-rating-reset — FIN-02 and shared overdue calculation.
3. fix/company-balance-concurrency — FIN-03 serializable retries and exact decimal deltas.
4. feat/tenant-backup-restore — encrypted full tenant backup.

## Deployment prerequisites

Before the security release, run scripts/tests/diagnose-tenant-relations.sql read-only against the target database. Resolve ownership discrepancies deliberately; the migration refuses inconsistent ledgers. Apply migrations with the project's existing migration process. New tables/constraints are also supplied as Prisma migrations; do not bypass failed validation.

JWT_SECRET must be a private random secret of at least 32 characters; fallback secrets are rejected at startup. Optional SHARE_SECRET must also be strong; otherwise a purpose-specific key is derived from JWT_SECRET. Existing sessions require login again. Existing share links must be recreated.

For backup, configure a separate random TENANT_BACKUP_SECRET of at least 32 characters and retain it securely for future restores. Never commit its value. Without it only backup is unavailable. Receipt storage must remain persistent.

## Behavior and boundaries

USER cannot change shop-wide settings or delete business records. ADMIN and SUPER_ADMIN can; records with financial history cannot be hard-deleted. PIN is a privacy gate, not a replacement for backend authorization. Attempts are rate limited in the database. Password/role/user updates revoke sessions; changing your own password or PIN reissues your session.

Payment checkbox remains intentional: a checked small payment resets days. Unchecked payments use the existing automatic payment-ratio policy. Payments are counted once across multiple debts. Advance balances are not prohibited. General payment request idempotency and separate advance display are not implemented in this series.

Company edits retry serialization conflicts using fresh values and Decimal arithmetic. Snapshot refresh remains outside these transactions; this does not claim to resolve the separate FIN-04 snapshot task.

Backup includes 15 tables, ordinary users and their password/PIN hashes, notification preferences/device subscriptions, settings, debtor/company ledgers, audit/import history, daily snapshots, and receipt bytes. The entire archive is encrypted and authenticated. Platform SUPER_ADMIN users, sessions, runtime secrets and rate-limit counters are deliberately excluded. Audit/import history is retained on restore. Client name is restored; slug and active state are preserved.

Restore is SUPER_ADMIN-only with password reauthentication and preview confirmation, and only to the same tenant ID/slug. It is not shop-to-shop copying. It replaces business data atomically, rejects global ID collisions and revokes restored users' sessions. Receipts are written under new names with rollback cleanup; old files remain for later orphan cleanup. Table locks briefly pause writes across shops: schedule restore during maintenance. Current limit is 100 MiB decoded archive and 2 MiB per receipt; oversized/missing data fails explicitly. Keep a fresh backup before restoring older data.

## Verification

115 Jest tests passed; TypeScript and production build passed. SQL tests use PGlite PostgreSQL WASM: five composite foreign keys, wrong-tenant insert/update rejection, cascade and dirty migration rollback; full 15-table plus receipt export/restore, unchanged second tenant, platform-user preservation and failed-restore rollback. Company retry tests simulate a serialization conflict; native multi-connection PostgreSQL contention and browser UI have not been tested here. No production restore was performed.

Run npm test -- --runInBand, npm run test:tenant-db, npm run test:tenant-backup, npx tsc --noEmit and npm run build. Before production merging, manually verify two-shop import/share isolation, login/revocation, payment checkbox on/off, and backup preview/restore in staging.
