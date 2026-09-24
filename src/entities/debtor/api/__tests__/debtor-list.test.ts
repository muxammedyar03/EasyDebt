import { prisma } from "@/lib/prisma";
import { DebtorRepository } from "../debtor.repository";
jest.mock("@/lib/prisma", () => ({ prisma: { $transaction: jest.fn() } }));
it("shares a repeatable snapshot and enforces tenant scope on ledger relations", async () => {
  const raw = jest
    .fn()
    .mockResolvedValueOnce([{ total: 2 }])
    .mockResolvedValueOnce([{ id: 2 }, { id: 1 }]);
  const findMany = jest.fn().mockResolvedValue([{ id: 1 }, { id: 2 }]);
  (prisma.$transaction as jest.Mock).mockImplementation(async (cb) => cb({ $queryRaw: raw, debtor: { findMany } }));
  const result = await new DebtorRepository().withListReader(
    7,
    { search: "Ali" },
    { sortBy: "name" },
    async (reader) => ({ total: await reader.count(), data: await reader.read(0, 10) }),
  );
  expect(result).toEqual({ total: 2, data: [{ id: 2 }, { id: 1 }] });
  expect(findMany.mock.calls[0][0]).toMatchObject({
    where: { client_id: 7, id: { in: [2, 1] } },
    include: { debts: { where: { client_id: 7 } }, payments: { where: { client_id: 7 } } },
  });
  expect((prisma.$transaction as jest.Mock).mock.calls[0][1]).toMatchObject({ isolationLevel: "RepeatableRead" });
});
