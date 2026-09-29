import { refreshDebtorStatus } from "@/lib/security/refresh-debtor-status";
import { serializableTransaction } from "@/lib/security/serializable";
import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { revalidatePath } from "next/cache";

import { getSession } from "@/lib/auth";
import { requireClientId } from "@/lib/tenant";
import { createRequiredAuditLog } from "@/lib/audit";

const updatePaymentSchema = z.object({
  amount: z.number().positive("To'lov miqdori musbat bo'lishi kerak").optional(),
  payment_type: z.enum(["CASH", "CLICK", "CARD"]).optional(),
  note: z.string().nullable().optional(),
  created_at: z.string().optional(), // Dev mode: custom date
});

export async function PATCH(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const session = await getSession();
    if (!session) {
      return NextResponse.json({ error: "Tizimga kirishda xatolik. Iltimos, qaytadan kiring." }, { status: 401 });
    }

    const clientId = requireClientId(session);

    // Only allow in development mode
    if (process.env.NODE_ENV !== "development") {
      return NextResponse.json({ error: "Bu funksiya faqat development mode'da ishlaydi" }, { status: 403 });
    }

    const { id } = await params;
    const paymentId = parseInt(id);

    if (isNaN(paymentId)) {
      return NextResponse.json({ error: "Noto'g'ri ID" }, { status: 400 });
    }

    const body = await request.json();
    const validatedData = updatePaymentSchema.parse(body);

    const userId = session.userId;

    // Use transaction to update payment and recalculate debtor's total_debt
    const result = await serializableTransaction(async (tx) => {
      // Get old payment info
      const oldPayment = await tx.payment.findFirst({
        where: { id: paymentId, client_id: clientId },
        include: { debtor: true },
      });

      if (!oldPayment) {
        throw new Error("To'lov topilmadi");
      }

      const oldAmount = oldPayment.amount.toNumber();
      const newAmount = validatedData.amount ?? oldAmount;
      const amountDiff = newAmount - oldAmount;

      // Update payment record
      const updatedPayment = await tx.payment.update({
        where: { id: paymentId },
        data: {
          ...(validatedData.amount !== undefined && { amount: validatedData.amount }),
          ...(validatedData.payment_type !== undefined && { payment_type: validatedData.payment_type }),
          ...(validatedData.note !== undefined && { note: validatedData.note }),
          ...(validatedData.created_at && { created_at: new Date(validatedData.created_at) }),
        },
      });

      // Update debtor's total_debt if amount changed
      // Payment decreases debt, so if payment amount increases, debt should decrease more
      if (amountDiff !== 0) {
        await tx.debtor.update({
          where: { id: oldPayment.debtor_id },
          data: {
            total_debt: {
              decrement: amountDiff, // If payment increased, debt decreases more
            },
          },
        });
      }

      await refreshDebtorStatus(tx, clientId, oldPayment.debtor_id);
      await createRequiredAuditLog(tx, {
        clientId,
        userId,
        action: "PAYMENT_UPDATED",
        entityType: "PAYMENT",
        entityId: paymentId,
        oldValue: {
          amount: oldPayment.amount.toString(),
          payment_type: oldPayment.payment_type,
          note: oldPayment.note,
          created_at: oldPayment.created_at,
        },
        newValue: {
          amount: updatedPayment.amount.toString(),
          payment_type: updatedPayment.payment_type,
          note: updatedPayment.note,
          created_at: updatedPayment.created_at,
        },
        description: `To'lov #${paymentId} tahrirlandi (Dev Mode)`,
      });
      return { updatedPayment, oldPayment };
    });

    // Revalidate pages that display debtor data
    revalidatePath("/dashboard/debtors");
    revalidatePath("/dashboard/default");
    revalidatePath(`/dashboard/default/debitor/${result.oldPayment.debtor.external_id}`);

    return NextResponse.json(result.updatedPayment);
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: "Ma'lumotlar noto'g'ri kiritilgan", details: error.errors }, { status: 400 });
    }

    console.error("Error updating payment:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Serverda xatolik yuz berdi" },
      { status: 500 },
    );
  }
}
