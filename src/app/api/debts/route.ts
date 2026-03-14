import { NextRequest, NextResponse } from "next/server";
import { Prisma } from "@prisma/client";
import { z } from "zod";
import { revalidatePath } from "next/cache";

import { getSession } from "@/lib/auth";
import { createAuditLog } from "@/lib/audit";
import { createNotification } from "@/lib/notifications";
import { prisma } from "@/lib/prisma";
import { settingsRepository } from "@/entities/settings/api";

const createDebtSchema = z.object({
  debtor_id: z.number(),
  amount: z.number().positive("Qarz miqdori musbat bo'lishi kerak"),
  description: z.string().nullable().optional(),
  created_at: z.string().optional(), // Dev mode: custom date
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
          ...(validatedData.created_at && process.env.NODE_ENV === "development"
            ? { created_at: new Date(validatedData.created_at) }
            : {}),
        },
      });

      // Get debt limit from settings (inside transaction)
      const debtLimit = await settingsRepository.getDebtLimit(tx);

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

    // Get user info for description
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { first_name: true, last_name: true, username: true },
    });

    const userFullName =
      user?.first_name && user?.last_name ? `${user.first_name} ${user.last_name}` : user?.username || "Foydalanuvchi";

    const debtorFullName = `${result.debtor.first_name} ${result.debtor.last_name}`;
    const formattedAmount = validatedData.amount.toLocaleString("uz-UZ");
    const description = `${userFullName} qarzdor ${debtorFullName} ga ${formattedAmount} so'm miqdorda qarz qo'shdi`;

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
      description,
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

    // Revalidate pages that display debtor data
    revalidatePath("/dashboard/debtors");
    revalidatePath("/dashboard/default");
    revalidatePath(`/dashboard/default/debitor/${result.debtor.external_id}`);

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
