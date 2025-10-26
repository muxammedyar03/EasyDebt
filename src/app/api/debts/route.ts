import { NextRequest, NextResponse } from "next/server";
import { Prisma } from "@prisma/client";
import { z } from "zod";

import { getSession } from "@/lib/auth";
import { createAuditLog } from "@/lib/audit";
import { createNotification } from "@/lib/notifications";
import { prisma } from "@/lib/prisma";

const createDebtSchema = z.object({
  debtor_id: z.number(),
  amount: z.number().positive("Qarz miqdori musbat bo'lishi kerak"),
  description: z.string().nullable().optional(),
});

export async function POST(request: NextRequest) {
  try {
    const session = await getSession();
    if (!session) {
      return NextResponse.json({ error: "Tizimga kirishda xatolik. Iltimos, qaytadan kiring." }, { status: 401 });
    }

    const body = await request.json();
    const validatedData = createDebtSchema.parse(body);

    const userId = session.userId;

    // Use transaction to create debt and update debtor's total_debt
    const result = await prisma.$transaction(async (tx) => {
      // Get debtor info
      const debtor = await tx.debtor.findUnique({
        where: { id: validatedData.debtor_id },
      });

      if (!debtor) {
        throw new Error("Qarzdor topilmadi");
      }

      // Create debt record
      const debt = await tx.debt.create({
        data: {
          debtor_id: validatedData.debtor_id,
          amount: validatedData.amount,
          description: validatedData.description || null,
          created_by: userId,
        },
      });

      // Get debt limit from settings
      const debtLimitSetting = await tx.settings.findUnique({
        where: { key: "debt_limit" },
      });
      const debtLimit = debtLimitSetting ? parseFloat(debtLimitSetting.value) : 2000000;

      // Update debtor's total_debt
      const updatedDebtor = await tx.debtor.update({
        where: { id: validatedData.debtor_id },
        data: {
          total_debt: {
            increment: validatedData.amount,
          },
        },
      });

      return { debt, debtor, updatedDebtor, debtLimit };
    });

    // Create audit log
    await createAuditLog({
      userId,
      action: "DEBT_ADDED",
      entityType: "DEBT",
      entityId: result.debt.id,
      newValue: {
        debtor_id: validatedData.debtor_id,
        amount: validatedData.amount,
        description: validatedData.description,
      },
    });

    // Check if debt limit exceeded
    const newTotalDebt = result.updatedDebtor.total_debt.toNumber();
    if (newTotalDebt > result.debtLimit) {
      await createNotification({
        userId,
        debtorId: validatedData.debtor_id,
        type: "DEBT_LIMIT_EXCEEDED",
        title: "Qarz limiti oshdi",
        message: `${result.debtor.first_name} ${result.debtor.last_name} qarz limiti oshdi: ${newTotalDebt.toLocaleString()} so'm`,
      });
    }

    return NextResponse.json(result.debt, { status: 201 });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: "Ma'lumotlar noto'g'ri kiritilgan", details: error.errors }, { status: 400 });
    }

    console.error("Error creating debt:", error);

    if (error && typeof error === "object" && "code" in error) {
      const prismaError = error as { code: string; meta?: Prisma.PrismaClientKnownRequestError };

      if (prismaError.code === "P2003") {
        return NextResponse.json({ error: "Qarzdor topilmadi" }, { status: 404 });
      }
    }

    return NextResponse.json({ error: "Serverda xatolik yuz berdi" }, { status: 500 });
  }
}
