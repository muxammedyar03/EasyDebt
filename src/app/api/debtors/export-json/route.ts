import { NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { getApiErrorMessage } from "@/lib/errors";
import { createAuditLog } from "@/lib/audit";
import { debtorRepository } from "@/entities/debtor/api";
import type { DebtItem } from "@/types/domain";

type ExportDebt = {
  external_id: string;
  amount: number;
  description: string | null;
  items: DebtItem[] | null;
  created_at: string;
};

type ExportPayment = {
  external_id: string;
  amount: number;
  payment_type: string;
  note: string | null;
  created_at: string;
};

type ExportDebtor = {
  external_id: string;
  first_name: string;
  last_name: string;
  phone_number: string | null;
  address: string | null;
  debts: ExportDebt[];
  payments: ExportPayment[];
};

type ExportData = {
  meta: {
    exportedAt: string;
    version: number;
    exportedBy: string;
    debtorsCount: number;
    debtsCount: number;
    paymentsCount: number;
  };
  debtors: ExportDebtor[];
};

export async function GET() {
  try {
    const session = await getSession();

    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Faqat SUPER_ADMIN va ADMIN export qila oladi
    if (session.role === "USER") {
      return NextResponse.json({ error: "Faqat admin foydalanuvchilar export qila oladi" }, { status: 403 });
    }

    // Pagination bilan olish (50 tadan)
    const BATCH_SIZE = 50;
    const allDebtors: ExportDebtor[] = [];
    let skip = 0;
    let hasMore = true;

    while (hasMore) {
      const debtors = await debtorRepository.findMany(
        {},
        {
          take: BATCH_SIZE,
          skip,
          orderBy: { created_at: "desc" },
          include: {
            debts: { orderBy: { created_at: "desc" } },
            payments: { orderBy: { created_at: "desc" } },
          },
        },
      );

      if (debtors.length === 0) {
        hasMore = false;
        break;
      }

      type DebtorWithRelations = {
        external_id: string;
        first_name: string;
        last_name: string;
        phone_number: string | null;
        address: string | null;
        debts: {
          external_id: string;
          amount: { toNumber: () => number };
          description: string | null;
          items: unknown;
          created_at: Date;
        }[];
        payments: {
          external_id: string;
          amount: { toNumber: () => number };
          payment_type: string;
          note: string | null;
          created_at: Date;
        }[];
      };
      const formattedDebtors: ExportDebtor[] = debtors.map((debtor) => {
        const d = debtor as unknown as DebtorWithRelations;
        return {
          external_id: d.external_id,
          first_name: d.first_name,
          last_name: d.last_name,
          phone_number: d.phone_number,
          address: d.address,
          debts: d.debts.map((debt) => ({
            external_id: debt.external_id,
            amount: debt.amount.toNumber(),
            description: debt.description,
            items: debt.items as DebtItem[] | null,
            created_at: debt.created_at.toISOString(),
          })),
          payments: d.payments.map((payment) => ({
            external_id: payment.external_id,
            amount: payment.amount.toNumber(),
            payment_type: payment.payment_type,
            note: payment.note,
            created_at: payment.created_at.toISOString(),
          })),
        };
      });

      allDebtors.push(...formattedDebtors);
      skip += BATCH_SIZE;

      if (debtors.length < BATCH_SIZE) {
        hasMore = false;
      }
    }

    // Statistika
    const totalDebts = allDebtors.reduce((sum, d) => sum + d.debts.length, 0);
    const totalPayments = allDebtors.reduce((sum, d) => sum + d.payments.length, 0);

    const exportData: ExportData = {
      meta: {
        exportedAt: new Date().toISOString(),
        version: 1,
        exportedBy: session.username,
        debtorsCount: allDebtors.length,
        debtsCount: totalDebts,
        paymentsCount: totalPayments,
      },
      debtors: allDebtors,
    };

    await createAuditLog({
      userId: session.userId,
      action: "EXPORT",
      entityType: "DEBTOR",
      newValue: {
        debtorsCount: allDebtors.length,
        debtsCount: totalDebts,
        paymentsCount: totalPayments,
      },
      description: `Qarzdorlar ro'yxati JSON formatida export qilindi.`,
    });

    return NextResponse.json(exportData);
  } catch (error) {
    console.error("Export JSON error:", error);
    return NextResponse.json({ error: getApiErrorMessage(error) }, { status: 500 });
  }
}
