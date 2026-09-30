import { hasPermission } from "@/lib/security/permission-access";
import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { revalidatePath } from "next/cache";

import { getSession } from "@/lib/auth";
import { requireClientId } from "@/lib/tenant";
import { createRequiredAuditLog } from "@/lib/audit";
import { AuditUndoError } from "@/lib/audit-undo";
import { prisma } from "@/lib/prisma";

const updateDebtSchema = z.object({
  amount: z.number().positive("Qarz miqdori musbat bo'lishi kerak").optional(),
  description: z.string().nullable().optional(),
  created_at: z.string().optional(), // Dev mode: custom date
});

export async function PATCH(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const session = await getSession();
    if (session && !(await hasPermission(session, "debts.edit"))) return NextResponse.json({ error: "Ruxsat yo‘q" }, { status: 403 });
    if (!session) {
      return NextResponse.json({ error: "Tizimga kirishda xatolik. Iltimos, qaytadan kiring." }, { status: 401 });
    }

    const clientId = requireClientId(session);

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
      const oldDebt = await tx.debt.findFirst({
        where: { id: debtId, client_id: clientId },
        include: { debtor: true, reversals: { select: { id: true }, take: 1 } },
      });

      if (!oldDebt) {
        throw new Error("Qarz topilmadi");
      }
      if (oldDebt.reverses_debt_id || oldDebt.reversals.length)
        throw new AuditUndoError("Bekor qilingan qarz yozuvini o‘zgartirib bo‘lmaydi", 409);

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

      await createRequiredAuditLog(tx, {
        clientId,
        userId,
        action: "DEBT_UPDATED",
        entityType: "DEBT",
        entityId: debtId,
        oldValue: {
          amount: oldDebt.amount.toString(),
          description: oldDebt.description,
          created_at: oldDebt.created_at,
        },
        newValue: {
          amount: updatedDebt.amount.toString(),
          description: updatedDebt.description,
          created_at: updatedDebt.created_at,
        },
        description: `Qarz #${debtId} tahrirlandi (Dev Mode)`,
      });

      return { updatedDebt, oldDebt };
    });

    // Revalidate pages that display debtor data
    revalidatePath("/dashboard/debtors");
    revalidatePath("/dashboard/default");
    revalidatePath(`/dashboard/default/debitor/${result.oldDebt.debtor.external_id}`);

    return NextResponse.json(result.updatedDebt);
  } catch (error) {
    if (error instanceof AuditUndoError)
      return NextResponse.json({ error: error.message }, { status: error.status });
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
