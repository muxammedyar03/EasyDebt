import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { CompanyPaymentService, PaymentConflictError } from "../company-payment.service";
import { companyDailySnapshotService } from "../company-daily-snapshot.service";
import { PaymentTypeDomain } from "@/types/domain/payment.domain";
jest.mock("@/lib/prisma", () => ({ prisma: { $transaction: jest.fn() } }));
jest.mock("../company-daily-snapshot.service", () => ({ companyDailySnapshotService: { refreshForDate: jest.fn() } }));
jest.mock("@/lib/mappers/company.mapper", () => ({ prismaToDomainCompanyPayment: (row: unknown) => row }));
const input = {
  companyId: 2,
  amount: 10,
  paymentType: PaymentTypeDomain.CASH,
  createdBy: 3,
  idempotencyKey: "11111111-1111-4111-8111-111111111111",
};
const service = new CompanyPaymentService();
let committed: Array<{ external_id: string; client_id: number; [key: string]: unknown }>;
let audits: number;
let balance: number;
let currentTx: unknown;
beforeEach(() => {
  jest.clearAllMocks();
  committed = [];
  audits = 0;
  balance = 100;
  (companyDailySnapshotService.refreshForDate as jest.Mock).mockResolvedValue({});
  (prisma.$transaction as jest.Mock).mockImplementation(async (fn) => {
    const rows = [...committed];
    let nextBalance = balance;
    let nextAudits = audits;
    currentTx = {
      company: {
        findFirst: jest.fn(async () => ({ id: 2, name: "Shop" })),
        update: jest.fn(async ({ data }) => {
          nextBalance -= data.total_debt.decrement;
        }),
      },
      companyPayment: {
        findFirst: jest.fn(
          async ({ where }) =>
            rows.find((r) => r.external_id === where.external_id && r.client_id === where.client_id) ?? null,
        ),
        create: jest.fn(async ({ data }) => {
          const row = { id: rows.length + 1, created_at: new Date(), ...data, amount: new Prisma.Decimal(data.amount) };
          rows.push(row);
          return row;
        }),
      },
      auditLog: {
        create: jest.fn(async () => {
          nextAudits++;
        }),
      },
    };
    const result = await fn(currentTx);
    committed = rows;
    balance = nextBalance;
    audits = nextAudits;
    return result;
  });
});
it("snapshot failure rejects inside the transaction; retry creates only one payment and audit", async () => {
  (companyDailySnapshotService.refreshForDate as jest.Mock).mockRejectedValueOnce(new Error("snapshot failed"));
  await expect(service.create(1, input)).rejects.toThrow("snapshot failed");
  expect(committed).toHaveLength(0);
  expect(balance).toBe(100);
  expect(audits).toBe(0);
  expect(companyDailySnapshotService.refreshForDate).toHaveBeenLastCalledWith(1, expect.any(Date), currentTx);
  await service.create(1, input);
  await service.create(1, input);
  expect(committed).toHaveLength(1);
  expect(balance).toBe(90);
  expect(audits).toBe(1);
});
it("same key cannot be used to change the payment payload", async () => {
  await service.create(1, input);
  await expect(service.create(1, { ...input, amount: 20 })).rejects.toBeInstanceOf(PaymentConflictError);
  expect(balance).toBe(90);
  expect(committed).toHaveLength(1);
});
it("keys are scoped to shop and actor", async () => {
  await service.create(1, input);
  await service.create(2, input);
  await service.create(1, { ...input, createdBy: 4 });
  expect(new Set(committed.map((r) => r.external_id)).size).toBe(3);
});
