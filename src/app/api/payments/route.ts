import { NextRequest, NextResponse } from "next/server";
import { Prisma } from "@prisma/client";
import { z } from "zod";
import { revalidatePath } from "next/cache";

import { getSession } from "@/lib/auth";
import { createAuditLog } from "@/lib/audit";
import { prisma } from "@/lib/prisma";

const createPaymentSchema = z.object({
  debtor_id: z.number(),
  amount: z.number().positive("To'lov miqdori musbat bo'lishi kerak"),
  payment_type: z.enum(["CASH", "CLICK", "CARD"]),
  note: z.string().nullable().optional(),
  resets_rating: z.boolean().optional(),
  created_at: z.string().optional(), // Dev mode: custom date
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

      // Create payment record
      const payment = await tx.payment.create({
        data: {
          debtor_id: validatedData.debtor_id,
          amount: validatedData.amount,
          payment_type: validatedData.payment_type,
          note: validatedData.note || null,
          resets_rating: validatedData.resets_rating ?? false,
          created_by: userId,
          ...(validatedData.created_at && process.env.NODE_ENV === "development"
            ? { created_at: new Date(validatedData.created_at) }
            : {}),
        },
      });

      // Update debtor's total_debt (decrease) and payment date
      const updatedDebtor = await tx.debtor.update({
        where: { id: validatedData.debtor_id },
        data: {
          total_debt: {
            decrement: validatedData.amount,
          },
          last_payment_date: new Date(),
          is_overdue: false,
        },
      });

      return { payment, debtor, updatedDebtor };
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
    const description = `${userFullName} qarzdor ${debtorFullName} dan ${formattedAmount} so'm miqdorda ${validatedData.payment_type == "CASH" ? "naqd usulda" : validatedData.payment_type == "CLICK" ? "click orqali" : "karta orqali"} to'lov qabul qildi`;

    // Create audit log
    await createAuditLog({
      userId,
      action: "UPDATE",
      entityType: "PAYMENT",
      entityId: result.payment.id,
      newValue: {
        debtor_id: validatedData.debtor_id,
        amount: validatedData.amount,
        payment_type: validatedData.payment_type,
      },
      description,
    });

    // Revalidate pages that display debtor data
    revalidatePath("/dashboard/debtors");
    revalidatePath("/dashboard/default");
    revalidatePath(`/dashboard/default/debitor/${result.debtor.external_id}`);

    return NextResponse.json(
      {
        ...JSON.parse(
          JSON.stringify(result.payment, (_key, value) =>
            typeof value === "bigint" || (value && typeof value === "object" && "toNumber" in value)
              ? Number(value)
              : value,
          ),
        ),
        previousBalance: result.debtor.total_debt.toNumber(),
        newBalance: result.updatedDebtor.total_debt.toNumber(),
        debtorName: `${result.debtor.first_name} ${result.debtor.last_name}`,
        debtorPhone: result.debtor.phone_number,
        employeeName: userFullName,
      },
      { status: 201 },
    );
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
