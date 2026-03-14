import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/auth";
import { getApiErrorMessage } from "@/lib/errors";
import { z } from "zod";
import { Prisma } from "@prisma/client";
import { revalidatePath } from "next/cache";
import { debtorService } from "@/lib/services/debtor.service";

const createDebtorSchema = z.object({
  first_name: z.string().min(1),
  last_name: z.string().min(1),
  phone_number: z.string().nullable().optional(),
  address: z.string().nullable().optional(),
  debt_amount: z.number().nullable().optional(),
  debt_description: z.string().nullable().optional(),
});

export async function GET() {
  try {
    const session = await getSession();
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const debtors = await debtorService.getDebtorsWithOverdueForApi();
    return NextResponse.json(debtors);
  } catch (error) {
    console.error("Error fetching debtors:", error);
    return NextResponse.json({ error: getApiErrorMessage(error) }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    // Get user session
    const session = await getSession();
    if (!session) {
      return NextResponse.json({ error: "Tizimga kirishda xatolik. Iltimos, qaytadan kiring." }, { status: 401 });
    }

    const body = await request.json();
    const validatedData = createDebtorSchema.parse(body);

    // Get userId from session
    const userId = session.userId;

    // Use transaction to create debtor and debt together
    const result = await prisma.$transaction(async (tx) => {
      const debtor = await tx.debtor.create({
        data: {
          first_name: validatedData.first_name,
          last_name: validatedData.last_name,
          phone_number: validatedData.phone_number || null,
          address: validatedData.address || null,
          total_debt: validatedData.debt_amount || 0,
          created_by: userId,
        },
      });

      // If debt amount is provided, create a debt record
      if (validatedData.debt_amount && validatedData.debt_amount > 0) {
        await tx.debt.create({
          data: {
            debtor_id: debtor.id,
            amount: validatedData.debt_amount,
            description: validatedData.debt_description || null,
            created_by: userId,
          },
        });
      }

      const debtorFullName = `${validatedData.first_name} ${validatedData.last_name}`;
      const description = `Yangi qarzdor ${debtorFullName} yaratildi`;

      await tx.auditLog.create({
        data: {
          user_id: session.userId,
          action: "CREATE",
          entity_type: "DEBTOR",
          new_value: {
            debtor_id: debtor.id,
            first_name: validatedData.first_name,
            last_name: validatedData.last_name,
            phone_number: validatedData.phone_number,
            address: validatedData.address,
          },
          description,
          ip_address: request.headers.get("cf-connecting-ip") || "",
          user_agent: request.headers.get("user-agent") || "",
        },
      });

      return debtor;
    });

    // Revalidate pages that display debtor data
    revalidatePath("/dashboard/debtors");
    revalidatePath("/dashboard/default");

    return NextResponse.json(result, { status: 201 });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: "Ma'lumotlar noto'g'ri kiritilgan", details: error.errors }, { status: 400 });
    }

    console.error("Error creating debtor:", error);

    if (error && typeof error === "object" && "code" in error) {
      const prismaError = error as { code: string };
      if (prismaError.code === "P2003") {
        return NextResponse.json({ error: "Tizimga kirishda xatolik. Iltimos, qaytadan kiring." }, { status: 401 });
      }
    }

    return NextResponse.json({ error: getApiErrorMessage(error) }, { status: 500 });
  }
}
