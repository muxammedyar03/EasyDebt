import { Prisma } from "@prisma/client";
import { assertImportOwnership, debtorImportSchema, ImportOwnershipError } from "../debtor-import";

const debtorId = "11111111-1111-4111-8111-111111111111";
const debtId = "22222222-2222-4222-8222-222222222222";
const paymentId = "33333333-3333-4333-8333-333333333333";
const data = debtorImportSchema.parse({
  meta: { version: 1 },
  debtors: [
    {
      external_id: debtorId,
      first_name: "A",
      last_name: "B",
      debts: [{ external_id: debtId, amount: 100, created_at: "2026-01-01T00:00:00Z" }],
      payments: [
        {
          external_id: paymentId,
          amount: 1,
          payment_type: "CASH",
          resets_rating: true,
          created_at: "2026-01-02T00:00:00Z",
        },
      ],
    },
  ],
});
function transaction(tenant: number, childTenant = tenant, parentId = debtorId) {
  return {
    debtor: { findMany: jest.fn().mockResolvedValue([{ external_id: debtorId, client_id: tenant }]) },
    debt: {
      findMany: jest
        .fn()
        .mockResolvedValue([
          { external_id: debtId, client_id: childTenant, debtor: { external_id: parentId, client_id: tenant } },
        ]),
    },
    payment: {
      findMany: jest
        .fn()
        .mockResolvedValue([
          { external_id: paymentId, client_id: childTenant, debtor: { external_id: parentId, client_id: tenant } },
        ]),
    },
  } as unknown as Prisma.TransactionClient;
}
it("accepts same-tenant records with the correct parent", async () => {
  await expect(assertImportOwnership(transaction(1), 1, data)).resolves.toBeUndefined();
});
it("rejects tenant B export into tenant A", async () => {
  await expect(assertImportOwnership(transaction(2), 1, data)).rejects.toBeInstanceOf(ImportOwnershipError);
});
it("rejects a foreign child even when the debtor belongs to A", async () => {
  await expect(assertImportOwnership(transaction(1, 2), 1, data)).rejects.toBeInstanceOf(ImportOwnershipError);
});
it("rejects reusing a child belonging to a different debtor in the same tenant", async () => {
  await expect(assertImportOwnership(transaction(1, 1, "another-debtor"), 1, data)).rejects.toBeInstanceOf(
    ImportOwnershipError,
  );
});
it("rejects duplicate child IDs and invalid nested data", () => {
  const duplicate = structuredClone(data);
  duplicate.debtors[0].payments.push(duplicate.debtors[0].payments[0]);
  expect(debtorImportSchema.safeParse(duplicate).success).toBe(false);
  const invalid = structuredClone(data);
  invalid.debtors[0].debts[0].amount = -1;
  expect(debtorImportSchema.safeParse(invalid).success).toBe(false);
});
it("preserves explicit manual rating reset on import", () => {
  expect(debtorImportSchema.parse(data).debtors[0].payments[0].resets_rating).toBe(true);
});
