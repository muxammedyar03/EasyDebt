# Full JSON transfer and backup modal

The Debtors Export JSON button now exports the full tenant inventory rather than only debtors/debts/payments. JSON v2 contains visible counts plus an authenticated encrypted archive with all 15 tenant tables and company receipt bytes. Empty tables remain in the inventory. A schema-coverage test fails when a tenant model is added without backup coverage.

`TENANT_BACKUP_SECRET` (at least 32 random characters) is required for full JSON and encrypted backups. Keep the same secret for subsequent imports. Password/PIN hashes and push subscription keys are never exposed as plaintext in downloaded JSON. Platform superadmin accounts, runtime secrets and operational rate-limit counters remain excluded. Client identity is included, but cannot be moved to another client.

## Debtors JSON import

Existing v1 debtor JSON files still use the existing import flow. V2 files require authenticated server preview, current admin password and confirmation. ADMIN and SUPER_ADMIN can transfer their effective tenant; USER cannot.

V2 imports add missing row IDs and preserve existing rows, including settings and user credentials. They do not overwrite newer edits or delete records absent from the file. Ledger balances are recalculated from merged debts/payments. A conflicting unique key under a different row ID aborts the transaction instead of silently omitting a row or transferring ownership. This is same-shop transfer, not migration into a newly created shop. Re-importing does not duplicate ledger entries; each operation still creates its audit event.

All table counts are visible before confirmation. Legacy files contain only debtor data; missing historical tables cannot be reconstructed from an old file. Export a new v2 JSON to include those tables.

## Shops backup modal

The compact button opens a scrollable modal with Download and Restore sections. Restore retains its distinct replacement behavior and is SUPER_ADMIN-only: it replaces current shop business data with the chosen backup, preserves platform users and audit/import history, and requires explicit confirmation. Closing the modal clears credentials and selected backup. The modal cannot close during an active operation.

Both import/restore validate tenant identity and inventory. Restores/imports temporarily lock affected tables, so use a quiet period for large files. Limits remain 100 MiB decoded snapshot, 150 MiB transfer and 2 MiB per receipt. Missing receipts fail the whole export.

Validation: Jest covers inventory against Prisma, archive integrity, import permissions/confirmation/password/rate limit, legacy import and modal interaction. PGlite executes full 15-table+receipt round trip, merge preservation/repeat import, other-tenant invariance and rollback. Production build/type checking are run separately. Browser visual review and production restores are not performed by these tests.
