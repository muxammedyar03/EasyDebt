-- Read-only: run before applying tenant relation constraints.
SELECT 'debts' AS source, c.id, c.client_id, p.client_id AS parent_client_id
FROM debts c JOIN debtors p ON p.id=c.debtor_id WHERE c.client_id<>p.client_id
UNION ALL
SELECT 'payments', c.id, c.client_id, p.client_id
FROM payments c JOIN debtors p ON p.id=c.debtor_id WHERE c.client_id<>p.client_id
UNION ALL
SELECT 'payment_reminders', c.id, c.client_id, p.client_id
FROM payment_reminders c JOIN debtors p ON p.id=c.debtor_id WHERE c.client_id<>p.client_id
UNION ALL
SELECT 'company_debts', c.id, c.client_id, p.client_id
FROM company_debts c JOIN companies p ON p.id=c.company_id WHERE c.client_id<>p.client_id
UNION ALL
SELECT 'company_payments', c.id, c.client_id, p.client_id
FROM company_payments c JOIN companies p ON p.id=c.company_id WHERE c.client_id<>p.client_id;
