/** Rebuild affected dates in one statement, without a query per historical day.
 * Prisma timestamps are UTC timestamp WITHOUT time zone, hence the two conversions.
 * All source rows and destination writes are scoped to the supplied client.
 */
const snapshotBalancesSql = `
WITH ledger AS (
  SELECT ((created_at AT TIME ZONE 'UTC') AT TIME ZONE 'Asia/Tashkent')::date AS day,
         amount AS debt, 0::numeric AS payment, 1 AS debt_count, 0 AS payment_count
  FROM company_debts WHERE client_id = $1
  UNION ALL
  SELECT ((created_at AT TIME ZONE 'UTC') AT TIME ZONE 'Asia/Tashkent')::date,
         0::numeric, amount, 0, 1
  FROM company_payments WHERE client_id = $1
), daily AS (
  SELECT day, SUM(debt) AS debts_sum, SUM(payment) AS payments_sum,
         SUM(debt_count)::int AS debts_count, SUM(payment_count)::int AS payments_count
  FROM ledger GROUP BY day
), dates AS (
  SELECT date AS day FROM company_daily_snapshots WHERE client_id = $1
  UNION SELECT day FROM daily
  UNION SELECT $2::date
  UNION SELECT $3::date
), balances AS (
  SELECT dates.day,
         SUM(COALESCE(daily.debts_sum, 0) - COALESCE(daily.payments_sum, 0))
           OVER (ORDER BY dates.day ROWS UNBOUNDED PRECEDING) AS outstanding,
         COALESCE(daily.debts_sum, 0) AS debts_sum,
         COALESCE(daily.payments_sum, 0) AS payments_sum,
         COALESCE(daily.debts_count, 0) AS debts_count,
         COALESCE(daily.payments_count, 0) AS payments_count
  FROM dates LEFT JOIN daily ON dates.day = daily.day
)
`;

export const companySnapshotSeriesSql = `${snapshotBalancesSql}
SELECT day::text AS date, outstanding AS total_outstanding_debt, payments_sum
FROM balances WHERE day >= $2::date AND day <= $3::date ORDER BY day
`;

export const rebuildCompanySnapshotHistorySql = `${snapshotBalancesSql}
INSERT INTO company_daily_snapshots
  (client_id, date, total_outstanding_debt, debts_sum, payments_sum,
   debts_count, payments_count, created_at, updated_at)
SELECT $1, day, outstanding, debts_sum, payments_sum, debts_count, payments_count,
       (CURRENT_TIMESTAMP AT TIME ZONE 'UTC'), (CURRENT_TIMESTAMP AT TIME ZONE 'UTC')
FROM balances WHERE day >= $2::date
ON CONFLICT (client_id, date) DO UPDATE SET
  total_outstanding_debt = EXCLUDED.total_outstanding_debt,
  debts_sum = EXCLUDED.debts_sum, payments_sum = EXCLUDED.payments_sum,
  debts_count = EXCLUDED.debts_count, payments_count = EXCLUDED.payments_count,
  updated_at = EXCLUDED.updated_at
`;
