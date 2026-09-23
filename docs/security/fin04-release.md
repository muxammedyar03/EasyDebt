# FIN-04: company payment consistency

Company debt/payment create, edit and delete now refresh the daily snapshot on the same Prisma transaction client as the ledger mutation. Snapshot failures roll back the mutation; no post-commit snapshot failure is reported as an unsuccessful payment. Snapshot totals use ledger sums up to the requested day rather than today's company balance, preserving Decimal arithmetic.

Company payment creation also records its audit and generated receipt name inside that transaction. The payment dialog retains an Idempotency-Key UUID for a failed submission, and rotates it after success or changing the payload. The API validates the optional UUID for compatibility with older clients. The service derives a shop+actor scoped unique payment external ID. An exact replay returns the existing payment without decrementing the balance or adding another audit. Different contents under the same key return 409; receipt content is compared as well. A unique-ID race retries by rereading the committed winner.

No database migration is needed. Existing payment IDs remain unchanged. Clients that omit the key still work but cannot obtain request replay protection. Protection persists while the original payment record exists; durable tombstones for deleted payments and idempotency on the separate debtor payment API remain follow-up work. A UI reload loses its pending key; ambiguous network failures across reloads still require checking payment history.

Tests cover failure inside the transaction boundary, retry, replay, changed payload rejection, shop/actor isolation and exact historical aggregation. These are unit tests with a transaction model, not a native PostgreSQL contention test. Full regression tests, TypeScript and production build are required before publishing.

Remaining FIN-05 work: centralize Asia/Tashkent date boundaries and rebuild/invalidate all snapshots affected by historical edits. Remaining AUD-01 work: apply atomic audit to other mutation paths; this commit covers company payment creation only.
