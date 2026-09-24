import { Prisma } from "@prisma/client";

export type ListFilters = { search?: string; status?: string; createdBy?: number; minDebt?: number; maxDebt?: number };
const escapeLike = (term: string) => term.replace(/\\/g, "\\\\").replace(/%/g, "\\%").replace(/_/g, "\\_");

/** Build the same tenant-scoped predicate for list pages and exact counts. */
export function listPredicate(clientId: number, filters: ListFilters = {}): Prisma.Sql {
  if (!Number.isSafeInteger(clientId) || clientId <= 0) throw new Error("Client context required");
  const clauses: Prisma.Sql[] = [Prisma.sql`client_id = ${clientId}`];
  for (const term of filters.search?.trim().split(/\s+/).filter(Boolean) ?? []) {
    const name = `%${escapeLike(term)}%`;
    const alternatives: Prisma.Sql[] = [
      Prisma.sql`first_name ILIKE ${name}`,
      Prisma.sql`last_name ILIKE ${name}`,
      Prisma.sql`address ILIKE ${name}`,
    ];
    const digits = term.replace(/\D/g, "");
    if (digits) alternatives.push(Prisma.sql`regexp_replace(phone_number, '[^0-9]', '', 'g') LIKE ${`%${digits}%`}`);
    clauses.push(Prisma.sql`(${Prisma.join(alternatives, " OR ")})`);
  }
  if (filters.createdBy !== undefined) clauses.push(Prisma.sql`created_by = ${filters.createdBy}`);
  if (filters.status === "paid_off") clauses.push(Prisma.sql`total_debt <= 0`);
  if (filters.status === "active" || filters.status === "overdue") clauses.push(Prisma.sql`total_debt > 0`);
  if (filters.minDebt !== undefined) clauses.push(Prisma.sql`total_debt >= ${filters.minDebt}`);
  if (filters.maxDebt !== undefined) clauses.push(Prisma.sql`total_debt <= ${filters.maxDebt}`);
  return Prisma.join(clauses, " AND ");
}

/** SQL identifiers and direction come only from this fixed allowlist. */
export function listOrder(sortBy?: string, sortOrder?: string): Prisma.Sql {
  let field: Prisma.Sql;
  switch (sortBy) {
    case "name":
    case "first_name":
      field = Prisma.sql`first_name`;
      break;
    case "last_name":
      field = Prisma.sql`last_name`;
      break;
    case "debt":
    case "total_debt":
      field = Prisma.sql`total_debt`;
      break;
    case "updated":
    case "updated_at":
      field = Prisma.sql`updated_at`;
      break;
    default:
      field = Prisma.sql`created_at`;
  }
  const direction = sortOrder === "asc" ? Prisma.sql`ASC` : Prisma.sql`DESC`;
  return Prisma.sql`${field} ${direction}, id ${direction}`;
}
export const countQuery = (where: Prisma.Sql) => Prisma.sql`SELECT count(*)::int AS total FROM debtors WHERE ${where}`;
export const idsQuery = (where: Prisma.Sql, order: Prisma.Sql, skip: number, take: number) =>
  Prisma.sql`SELECT id FROM debtors WHERE ${where} ORDER BY ${order} LIMIT ${take} OFFSET ${skip}`;
