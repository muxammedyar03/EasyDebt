import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { revalidatePath } from "next/cache";

import { getSession } from "@/lib/auth";
import { createAuditLog } from "@/lib/audit";
import { prisma } from "@/lib/prisma";

const updateDebtSchema = z.object({
  amount: z.number().positive("Сумма долга должна быть положительной").optional(),
  description: z.string().nullable().optional(),
  created_at: z.string().optional(), // Dev mode: custom date
});

export async function PATCH(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const session = await getSession();
    if (!session) {
      return NextResponse.json({ error: "Tizimga kirishda xatolik. Iltimos, qaytadan kiring." }, { status: 401 });
    }

    // Only allow in development mode
    if (process.env.NODE_ENV !== "development") {
      return NextResponse.json({ error: "Bu funksiya faqat development mode'da ishlaydi" }, { status: 403 });
    }

    const { id } = await params;
    const debtId = parseInt(id);

    if (isNaN(debtId)) {
      return NextResponse.json({ error: "Noto'g'ri ID" }, { status: 400 });
    }

    const body = await request.json();
    const validatedData = updateDebtSchema.parse(body);

    const userId = session.userId;

    // Use transaction to update debt and recalculate debtor's total_debt
    const result = await prisma.$transaction(async (tx) => {
      // Get old debt info
      const oldDebt = await tx.debt.findUnique({
        where: { id: debtId },
        include: { debtor: true },
      });

      if (!oldDebt) {
        throw new Error("Qarz topilmadi");
      }

      const oldAmount = oldDebt.amount.toNumber();
      const newAmount = validatedData.amount ?? oldAmount;
      const amountDiff = newAmount - oldAmount;

      // Update debt record
      const updatedDebt = await tx.debt.update({
        where: { id: debtId },
        data: {
          ...(validatedData.amount !== undefined && { amount: validatedData.amount }),
          ...(validatedData.description !== undefined && { description: validatedData.description }),
          ...(validatedData.created_at && { created_at: new Date(validatedData.created_at) }),
        },
      });

      // Update debtor's total_debt if amount changed
      if (amountDiff !== 0) {
        await tx.debtor.update({
          where: { id: oldDebt.debtor_id },
          data: {
            total_debt: {
              increment: amountDiff,
            },
          },
        });
      }

      return { updatedDebt, oldDebt };
    });

    // Get user info for description
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { first_name: true, last_name: true, username: true },
    });

    const userFullName =
      user?.first_name && user?.last_name ? `${user.first_name} ${user.last_name}` : user?.username || "Foydalanuvchi";

    const debtorFullName = `${result.oldDebt.debtor.first_name} ${result.oldDebt.debtor.last_name}`;
    const description = `${userFullName} qarzdor ${debtorFullName} ning qarzini tahrirladi (Dev Mode)`;

    // Create audit log
    await createAuditLog({
      userId,
      action: "DEBT_UPDATED",
      entityType: "DEBT",
      entityId: debtId,
      oldValue: {
        amount: result.oldDebt.amount.toNumber(),
        description: result.oldDebt.description,
        created_at: result.oldDebt.created_at,
      },
      newValue: {
        amount: result.updatedDebt.amount.toNumber(),
        description: result.updatedDebt.description,
        created_at: result.updatedDebt.created_at,
      },
      description,
    });

    // Revalidate pages that display debtor data
    revalidatePath("/dashboard/debtors");
    revalidatePath("/dashboard/default");
    revalidatePath(`/dashboard/default/debitor/${result.oldDebt.debtor.external_id}`);

    return NextResponse.json(result.updatedDebt);
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: "Ma'lumotlar noto'g'ri kiritilgan", details: error.errors }, { status: 400 });
    }

    console.error("Error updating debt:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Serverda xatolik yuz berdi" },
      { status: 500 },
    );
  }
}
