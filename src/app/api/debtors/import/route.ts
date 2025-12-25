import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import crypto from "crypto";
import { PaymentType, Prisma } from "@prisma/client";
import { DebtItem } from "@/types/types";

type ImportDebt = {
  external_id: string;
  amount: number;
  description: string | null;
  items: DebtItem[] | null;
  created_at: string;
};

type ImportPayment = {
  external_id: string;
  amount: number;
  payment_type: string;
  note: string | null;
  created_at: string;
};

type ImportDebtor = {
  external_id: string;
  first_name: string;
  last_name: string;
  phone_number: string | null;
  address: string | null;
  debts: ImportDebt[];
  payments: ImportPayment[];
};

type ImportData = {
  meta: {
    exportedAt: string;
    version: number;
    exportedBy?: string;
    debtorsCount: number;
    debtsCount: number;
    paymentsCount: number;
  };
  debtors: ImportDebtor[];
};

export async function POST(request: NextRequest) {
  try {
    const session = await getSession();

    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Faqat SUPER_ADMIN va ADMIN import qila oladi
    if (session.role === "USER") {
      return NextResponse.json({ error: "Faqat admin foydalanuvchilar import qila oladi" }, { status: 403 });
    }

    const body = await request.json();
    const importData = body as ImportData;

    // 1. Validation
    if (!importData.meta || !importData.debtors) {
      return NextResponse.json({ error: "Noto'g'ri fayl formati" }, { status: 400 });
    }

    if (importData.meta.version !== 1) {
      return NextResponse.json({ error: "Fayl versiyasi mos kelmaydi" }, { status: 400 });
    }

    // 2. File hash yaratish (duplicate import'dan himoya)
    const fileContent = JSON.stringify(importData);
    const fileHash = crypto.createHash("sha256").update(fileContent).digest("hex");

    // 3. Duplicate check
    const existingImport = await prisma.importHistory.findUnique({
      where: { file_hash: fileHash },
    });

    if (existingImport) {
      return NextResponse.json(
        {
          error: "Bu fayl allaqachon import qilingan",
          importedAt: existingImport.created_at,
        },
        { status: 409 },
      );
    }

    // 4. Transaction bilan import qilish
    const result = await prisma.$transaction(async (tx) => {
      const debtorMap = new Map<string, number>();
      let createdDebtors = 0;
      let createdDebts = 0;
      let createdPayments = 0;

      // 5. Debtorlarni yaratish
      for (const debtorData of importData.debtors) {
        // External ID orqali mavjudligini tekshirish
        const existingDebtor = await tx.debtor.findUnique({
          where: { external_id: debtorData.external_id },
        });

        let debtorId: number;

        if (existingDebtor) {
          // Agar mavjud bo'lsa, yangilaymiz
          const updated = await tx.debtor.update({
            where: { external_id: debtorData.external_id },
            data: {
              first_name: debtorData.first_name,
              last_name: debtorData.last_name,
              phone_number: debtorData.phone_number,
              address: debtorData.address,
            },
          });
          debtorId = updated.id;
        } else {
          // Yangi debtor yaratamiz
          const created = await tx.debtor.create({
            data: {
              external_id: debtorData.external_id,
              first_name: debtorData.first_name,
              last_name: debtorData.last_name,
              phone_number: debtorData.phone_number,
              address: debtorData.address,
              created_by: session.userId,
              total_debt: 0, // Keyinroq hisoblanadi
            },
          });
          debtorId = created.id;
          createdDebtors++;
        }

        // Mapping'ga qo'shamiz
        debtorMap.set(debtorData.external_id, debtorId);

        // 6. Debtlarni yaratish
        for (const debtData of debtorData.debts) {
          // External ID orqali mavjudligini tekshirish
          const existingDebt = await tx.debt.findUnique({
            where: { external_id: debtData.external_id },
          });

          if (!existingDebt) {
            await tx.debt.create({
              data: {
                external_id: debtData.external_id,
                debtor_id: debtorId,
                amount: new Prisma.Decimal(debtData.amount),
                description: debtData.description,
                items: debtData.items as DebtItem[],
                created_at: new Date(debtData.created_at),
                created_by: session.userId,
              },
            });
            createdDebts++;
          }
        }

        // 7. Paymentlarni yaratish
        for (const paymentData of debtorData.payments) {
          // External ID orqali mavjudligini tekshirish
          const existingPayment = await tx.payment.findUnique({
            where: { external_id: paymentData.external_id },
          });

          if (!existingPayment) {
            await tx.payment.create({
              data: {
                external_id: paymentData.external_id,
                debtor_id: debtorId,
                amount: new Prisma.Decimal(paymentData.amount) as Prisma.Decimal,
                payment_type: paymentData.payment_type as PaymentType,
                note: paymentData.note,
                created_at: new Date(paymentData.created_at),
                created_by: session.userId,
              },
            });
            createdPayments++;
          }
        }
      }

      // 8. Total debt'larni qayta hisoblash
      for (const [externalId, debtorId] of debtorMap.entries()) {
        const totalDebts = await tx.debt.aggregate({
          where: { debtor_id: debtorId },
          _sum: { amount: true },
        });

        const totalPayments = await tx.payment.aggregate({
          where: { debtor_id: debtorId },
          _sum: { amount: true },
        });

        const totalDebt = (totalDebts._sum.amount?.toNumber() || 0) - (totalPayments._sum.amount?.toNumber() || 0);

        await tx.debtor.update({
          where: { id: debtorId },
          data: {
            total_debt: new Prisma.Decimal(totalDebt),
            last_payment_date:
              totalPayments._sum.amount && totalPayments._sum.amount.toNumber() > 0 ? new Date() : null,
          },
        });
      }

      // 9. Import history yaratish
      await tx.importHistory.create({
        data: {
          user_id: session.userId,
          file_hash: fileHash,
          debtors_count: createdDebtors,
          debts_count: createdDebts,
          payments_count: createdPayments,
          status: "SUCCESS",
        },
      });

      // 10. Audit log
      await tx.auditLog.create({
        data: {
          user_id: session.userId,
          action: "IMPORT_DATA",
          entity_type: "DEBTOR",
          new_value: {
            debtorsCount: createdDebtors,
            debtsCount: createdDebts,
            paymentsCount: createdPayments,
          },
        },
      });

      return {
        debtorsCount: createdDebtors,
        debtsCount: createdDebts,
        paymentsCount: createdPayments,
      };
    });

    return NextResponse.json({
      success: true,
      message: "Ma'lumotlar muvaffaqiyatli import qilindi",
      ...result,
    });
  } catch (error) {
    console.error("Import error:", error);

    // Import history'ga xatolikni yozish
    try {
      const session = await getSession();
      if (session) {
        const body = await request.json();
        const fileContent = JSON.stringify(body);
        const fileHash = crypto.createHash("sha256").update(fileContent).digest("hex");

        await prisma.importHistory.create({
          data: {
            user_id: session.userId,
            file_hash: fileHash,
            debtors_count: 0,
            debts_count: 0,
            payments_count: 0,
            status: "FAILED",
            error_message: error instanceof Error ? error.message : "Unknown error",
          },
        });
      }
    } catch (logError) {
      console.error("Failed to log import error:", logError);
    }

    return NextResponse.json(
      {
        error: "Import paytida xatolik yuz berdi",
        details: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 },
    );
  }
}
