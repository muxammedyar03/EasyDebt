import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { revalidatePath } from "next/cache";

import { getSession } from "@/lib/auth";
import { requireClientId } from "@/lib/tenant";
import { createAuditLog } from "@/lib/audit";
import { prisma } from "@/lib/prisma";

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
    const result = await prisma.$transaction(async (tx) => {
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

      return { updatedPayment, oldPayment };
    });

    // Get user info for description
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { first_name: true, last_name: true, username: true },
    });

    const userFullName =
      user?.first_name && user?.last_name ? `${user.first_name} ${user.last_name}` : user?.username || "Foydalanuvchi";

    const debtorFullName = `${result.oldPayment.debtor.first_name} ${result.oldPayment.debtor.last_name}`;
    const description = `${userFullName} qarzdor ${debtorFullName} ning to'lovini tahrirladi (Dev Mode)`;

    // Create audit log
    await createAuditLog({
      clientId,
      userId,
      action: "PAYMENT_UPDATED",
      entityType: "PAYMENT",
      entityId: paymentId,
      oldValue: {
        amount: result.oldPayment.amount.toNumber(),
        payment_type: result.oldPayment.payment_type,
        note: result.oldPayment.note,
        created_at: result.oldPayment.created_at,
      },
      newValue: {
        amount: result.updatedPayment.amount.toNumber(),
        payment_type: result.updatedPayment.payment_type,
        note: result.updatedPayment.note,
        created_at: result.updatedPayment.created_at,
      },
      description,
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
