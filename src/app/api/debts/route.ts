import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/auth";
import { z } from "zod";

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
      // Create debt record
      const debt = await tx.debt.create({
        data: {
          debtor_id: validatedData.debtor_id,
          amount: validatedData.amount,
          description: validatedData.description || null,
          created_by: userId,
        },
      });

      // Update debtor's total_debt
      await tx.debtor.update({
        where: { id: validatedData.debtor_id },
        data: {
          total_debt: {
            increment: validatedData.amount,
          },
        },
      });

      return debt;
    });

    return NextResponse.json(result, { status: 201 });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: "Ma'lumotlar noto'g'ri kiritilgan", details: error.errors }, { status: 400 });
    }

    console.error("Error creating debt:", error);

    if (error && typeof error === "object" && "code" in error) {
      const prismaError = error as { code: string; meta?: any };

      if (prismaError.code === "P2003") {
        return NextResponse.json({ error: "Qarzdor topilmadi" }, { status: 404 });
      }
    }

    return NextResponse.json({ error: "Serverda xatolik yuz berdi" }, { status: 500 });
  }
}
