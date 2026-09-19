# TEN-01 / SEC-02 — implementation review

Base: main e3a9ef9619c99292cbd45ef2077ca1640e855b85. Release changes are published on feature branches for review.

## Changes

- Import validates nested data and rejects duplicate IDs before a transaction.
- Read-only ownership preflight rejects IDs from another tenant and child IDs belonging to another debtor. Every import mutation and aggregation also includes client_id.
- Import deduplication is tenant scoped; failed attempts do not reserve the success hash. Serializable conflicts return 409 for an explicit retry; inserts do not silently skip ownership conflicts.
- Explicit `resets_rating` in imported payments is preserved. The payment checkbox behavior is not changed by this patch.
- Five composite foreign keys prevent debts, payments, reminders, company debts and company payments from referencing a parent in another tenant. Tenant moves cannot cascade a ledger into another shop.
- Both the existing custom migration runner and the standard Prisma migration path apply the same constraints. Existing inconsistent data causes validation to fail and the constraint transaction to roll back. No financial data is rewritten.
- Share creation checks the debtor belongs to the effective tenant and that tenant is active. New signed tokens bind debtor + tenant + issuer + purpose/audience for 48 hours. The public page checks active issuer and tenant and reads only within the signed tenant. The service's unscoped null-tenant lookup is removed.

## Compatibility and remaining tasks

Existing unscoped share links must be recreated. Disabling the issuer/tenant invalidates access through its links; individual link revocation UI is not introduced here. The security branch also includes SEC-03 secret hardening and SEC-04 live session validation.

Import intentionally rejects a foreign shop export with colliding IDs rather than transferring ownership. An authorized shop-to-shop copy would need a separately specified ID-remapping feature.

The SQL test uses PGlite (PostgreSQL WASM) in memory, not the production database. It verifies the actual migration statements, tenant mismatches on insert/update, correct same-tenant inserts, delete cascade, idempotent rerun and rollback with pre-existing inconsistent data. It is not a production concurrency/load test.

## Local checks

```sh
npm ci
npx prisma generate
npm test -- --runInBand
npm run test:tenant-db
npx tsc --noEmit
npm run build
```

Prisma validation requires DATABASE_URL. Use a local/staging database, never point manual test fixtures at production.

Before deploying, run the read-only `scripts/tests/diagnose-tenant-relations.sql` against the intended database. It should return no rows. If it returns rows, investigate their ownership; do not disable validation or arbitrarily move/delete rows to get a deploy through.

## Manual A/B tenant checks

1. Create two shops A and B with different debtors. Record B's names, ledger totals and row counts.
2. As A admin, import B's exported data with B's existing IDs: expect 409 and no changes in either shop. Repeat with a foreign debt/payment ID nested under an A debtor.
3. Import a valid new A dataset: only A gains rows. Repeat: expect duplicate conflict and no duplicate financial entries.
4. As USER or logged out, import must return 403 or 401.
5. As A user, try share generation with B's known debtor UUID: it must fail. An A debtor share must open with its correct data.
6. Change the debtor UUID in the public link while preserving its token: it must fail. Old unscoped and expired tokens must fail.
7. Disable B/its issuer: its new share link must stop granting access. Re-enable only according to the existing business policy.
8. Recheck normal login, tenant switching, debtor details, and payment checkbox behavior.

See release-notes.md for branch order and deployment prerequisites.
