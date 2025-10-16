import { NextRequest, NextResponse } from "next/server";
import { Prisma } from "@prisma/client";
import { z } from "zod";

import { getSession } from "@/lib/auth";
import { createAuditLog } from "@/lib/audit";
import { createNotification } from "@/lib/notifications";
// import { updateDebtorPaymentDate } from "@/lib/overdue-checker";
import { prisma } from "@/lib/prisma";

const createPaymentSchema = z.object({
  debtor_id: z.number(),
  amount: z.number().positive("To'lov miqdori musbat bo'lishi kerak"),
  payment_type: z.enum(["CASH", "CLICK", "CARD"]),
  note: z.string().nullable().optional(),
});

export async function POST(request: NextRequest) {
  try {
    const session = await getSession();
    if (!session) {
      return NextResponse.json({ error: "Tizimga kirishda xatolik. Iltimos, qaytadan kiring." }, { status: 401 });
    }

    const body = await request.json();
    const validatedData = createPaymentSchema.parse(body);

    const userId = session.userId;

    // Use transaction to create payment and update debtor's total_debt
    const result = await prisma.$transaction(async (tx) => {
      // Get current debtor to check debt amount
      const debtor = await tx.debtor.findUnique({
        where: { id: validatedData.debtor_id },
      });

      if (!debtor) {
        throw new Error("Qarzdor topilmadi");
      }

      // Check if payment amount exceeds total debt
      const currentDebt = debtor.total_debt.toNumber();
      if (validatedData.amount > currentDebt) {
        throw new Error("To'lov miqdori umumiy qarzdan oshib ketdi");
      }

      // Create payment record
      const payment = await tx.payment.create({
        data: {
          debtor_id: validatedData.debtor_id,
          amount: validatedData.amount,
          payment_type: validatedData.payment_type,
          note: validatedData.note || null,
          created_by: userId,
        },
      });

      // Update debtor's total_debt (decrease) and payment date
      await tx.debtor.update({
        where: { id: validatedData.debtor_id },
        data: {
          total_debt: {
            decrement: validatedData.amount,
          },
          last_payment_date: new Date(),
          is_overdue: false,
        },
      });

      return { payment, debtor };
    });

    // Create audit log
    await createAuditLog({
      userId,
      action: "PAYMENT_ADDED",
      entityType: "PAYMENT",
      entityId: result.payment.id,
      newValue: {
        debtor_id: validatedData.debtor_id,
        amount: validatedData.amount,
        payment_type: validatedData.payment_type,
      },
    });

    // Create notification
    await createNotification({
      userId,
      debtorId: validatedData.debtor_id,
      type: "PAYMENT_RECEIVED",
      title: "To'lov qabul qilindi",
      message: `${result.debtor.first_name} ${result.debtor.last_name} - ${validatedData.amount.toLocaleString()} so'm to'lov qildi`,
    });

    return NextResponse.json(result.payment, { status: 201 });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: "Ma'lumotlar noto'g'ri kiritilgan", details: error.errors }, { status: 400 });
    }

    if (error instanceof Error) {
      return NextResponse.json({ error: error.message }, { status: 400 });
    }

    console.error("Error creating payment:", error);

    if (error && typeof error === "object" && "code" in error) {
      const prismaError = error as { code: string; meta?: Prisma.PrismaClientKnownRequestError };

      if (prismaError.code === "P2003") {
        return NextResponse.json({ error: "Qarzdor topilmadi" }, { status: 404 });
      }
    }

    return NextResponse.json({ error: "Serverda xatolik yuz berdi" }, { status: 500 });
  }
}
