import { offlineDebtorToDomain } from "../offline-debtor.mapper";
import type { OfflineDebtorItem } from "@/types/offline";

describe("offlineDebtorToDomain", () => {
  it("correctly converts an OfflineDebtorItem with debts and payments to DebtorDomain", () => {
    const offlineItem: OfflineDebtorItem = {
      id: 101,
      external_id: "ext-101",
      first_name: "Ali",
      last_name: "Valiyev",
      phone_number: "+998901234567",
      address: "Toshkent",
      total_debt: 75000,
      is_overdue: false,
      created_at: "2026-11-01T10:00:00.000Z",
      updated_at: "2026-11-02T10:00:00.000Z",
      debts: [
        {
          id: 201,
          external_id: "ext-d-201",
          debtor_id: 101,
          amount: 100000,
          description: "Oziq-ovqat mahsulotlari",
          created_at: "2026-11-01T11:00:00.000Z",
        },
      ],
      payments: [
        {
          id: 301,
          external_id: "ext-p-301",
          debtor_id: 101,
          amount: 25000,
          payment_type: "CLICK",
          note: "Qisman to'lov",
          resets_rating: false,
          created_at: "2026-11-02T12:00:00.000Z",
        },
      ],
    };

    const domain = offlineDebtorToDomain(offlineItem);

    expect(domain.id).toBe(101);
    expect(domain.externalId).toBe("ext-101");
    expect(domain.firstName).toBe("Ali");
    expect(domain.lastName).toBe("Valiyev");
    expect(domain.phoneNumber).toBe("+998901234567");
    expect(domain.address).toBe("Toshkent");
    expect(domain.totalDebt).toBe(75000);
    expect(domain.debts).toHaveLength(1);
    expect(domain.debts?.[0].amount).toBe(100000);
    expect(domain.payments).toHaveLength(1);
    expect(domain.payments?.[0].amount).toBe(25000);
    expect(domain.payments?.[0].paymentType).toBe("CLICK");
  });
});
