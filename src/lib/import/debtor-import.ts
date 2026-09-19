import { Prisma } from "@prisma/client";
import { z } from "zod";

const amount = z.number().finite().positive().max(99999999.99);
const nullableText = z.string().max(10000).nullable().optional();
const datedRecord = {
  external_id: z.string().uuid(),
  amount,
  created_at: z.string().datetime({ offset: true }),
};

export const debtorImportSchema = z
  .object({
    meta: z.object({ version: z.literal(1) }).passthrough(),
    debtors: z
      .array(
        z.object({
          external_id: z.string().uuid(),
          first_name: z.string().min(1).max(255),
          last_name: z.string().min(1).max(255),
          phone_number: nullableText,
          address: nullableText,
          debts: z.array(
            z.object({
              ...datedRecord,
              description: nullableText,
              items: z
                .array(
                  z.object({
                    name: z.string().max(1000),
                    price: z.number().finite().nonnegative(),
                    quantity: z.number().finite().positive().optional(),
                  }),
                )
                .nullable()
                .optional(),
            }),
          ),
          payments: z.array(
            z.object({
              ...datedRecord,
              payment_type: z.enum(["CASH", "CLICK", "CARD"]),
              note: nullableText,
              resets_rating: z.boolean().optional().default(false),
            }),
          ),
        }),
      )
      .max(50000),
  })
  .superRefine((data, ctx) => {
    for (const ids of [
      data.debtors.map((d) => d.external_id),
      data.debtors.flatMap((d) => d.debts.map((item) => item.external_id)),
      data.debtors.flatMap((d) => d.payments.map((item) => item.external_id)),
    ]) {
      if (new Set(ids).size !== ids.length) {
        ctx.addIssue({ code: z.ZodIssueCode.custom, message: "Duplicate external IDs in import" });
      }
    }
  });

export type DebtorImport = z.infer<typeof debtorImportSchema>;

export class ImportOwnershipError extends Error {
  constructor() {
    // Do not reveal which foreign tenant or record owns an identifier.
    super("Import identifiers conflict with existing records");
  }
}

/** Read-only collision check, inside the import transaction, BEFORE any write.
 * IDs are globally unique. Unscoped reads here only establish ownership; imported
 * data must never reuse a foreign tenant's ID or another debtor's child record.
 */
export async function assertImportOwnership(tx: Prisma.TransactionClient, clientId: number, data: DebtorImport) {
  const [debtors, debts, payments] = await Promise.all([
    tx.debtor.findMany({
      where: { external_id: { in: data.debtors.map((d) => d.external_id) } },
      select: { external_id: true, client_id: true },
    }),
    tx.debt.findMany({
      where: { external_id: { in: data.debtors.flatMap((d) => d.debts.map((x) => x.external_id)) } },
      select: { external_id: true, client_id: true, debtor: { select: { external_id: true, client_id: true } } },
    }),
    tx.payment.findMany({
      where: { external_id: { in: data.debtors.flatMap((d) => d.payments.map((x) => x.external_id)) } },
      select: { external_id: true, client_id: true, debtor: { select: { external_id: true, client_id: true } } },
    }),
  ]);
  if (debtors.some((d) => d.client_id !== clientId)) throw new ImportOwnershipError();
  for (const [records, kind] of [
    [debts, "debts"],
    [payments, "payments"],
  ] as const) {
    const parents = new Map(data.debtors.flatMap((d) => d[kind].map((x) => [x.external_id, d.external_id] as const)));
    if (
      records.some(
        (r) =>
          r.client_id !== clientId ||
          r.debtor.client_id !== clientId ||
          r.debtor.external_id !== parents.get(r.external_id),
      )
    )
      throw new ImportOwnershipError();
  }
}
