/** Bound parameters only. Scope both the ledger and joined debtor to the authenticated tenant. */
const ledger = `WITH ledger AS (
  SELECT 'payment'::text AS kind, p.id, p.debtor_id, d.external_id AS debtor_external_id,
    concat_ws(' ', d.first_name, d.last_name) AS debtor_name,
    d.total_debt AS debitor_total_debt, d.is_overdue AS debitor_is_overdue,
    p.amount, p.payment_type::text AS payment_type, p.note, p.created_at
  FROM payments p JOIN debtors d ON d.id = p.debtor_id AND d.client_id = p.client_id
  WHERE p.client_id = $1 AND p.created_at >= $2::timestamp AND p.created_at < $3::timestamp
  UNION ALL
  SELECT 'debt'::text, p.id, p.debtor_id, d.external_id,
    concat_ws(' ', d.first_name, d.last_name), d.total_debt, d.is_overdue,
    p.amount, NULL::text, p.description, p.created_at
  FROM debts p JOIN debtors d ON d.id = p.debtor_id AND d.client_id = p.client_id
  WHERE p.client_id = $1 AND p.created_at >= $2::timestamp AND p.created_at < $3::timestamp
) `;

export const reportTotalsSql = `${ledger} SELECT
  count(*) FILTER (WHERE kind = 'payment')::int AS payments_count,
  count(*) FILTER (WHERE kind = 'debt')::int AS debts_count,
  COALESCE(sum(amount) FILTER (WHERE kind = 'payment'), 0)::text AS total_payments,
  COALESCE(sum(amount) FILTER (WHERE kind = 'debt'), 0)::text AS total_debts,
  COALESCE(sum(amount) FILTER (WHERE payment_type = 'CASH'), 0)::text AS cash,
  COALESCE(sum(amount) FILTER (WHERE payment_type = 'CARD'), 0)::text AS card,
  COALESCE(sum(amount) FILTER (WHERE payment_type = 'CLICK'), 0)::text AS click FROM ledger`;

const columns = `kind, id, debtor_id, debtor_external_id, debtor_name,
  debitor_total_debt::text, debitor_is_overdue, amount::text, payment_type, note, created_at`;
export const reportPageSql = `${ledger} SELECT ${columns} FROM ledger WHERE kind = $4
  ORDER BY created_at DESC, id DESC LIMIT $5 OFFSET $6`;
/** Cursor covers both tables; stable within the export's repeatable-read snapshot. */
export const reportExportSql = `${ledger} SELECT ${columns} FROM ledger
  WHERE (kind, id) > ($4::text, $5::int) ORDER BY kind, id LIMIT $6`;
