import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/auth";
import { z } from "zod";

const createDebtorSchema = z.object({
  first_name: z.string().min(1),
  last_name: z.string().min(1),
  phone_number: z.string().nullable().optional(),
  address: z.string().nullable().optional(),
  debt_amount: z.number().nullable().optional(),
  debt_description: z.string().nullable().optional(),
});

export async function GET(request: NextRequest) {
  try {
    const session = await getSession();
    if (!session) {
      return NextResponse.json(
        { error: "Unauthorized" },
        { status: 401 }
      );
    }

    const debtorsRaw = await prisma.debtor.findMany({
      orderBy: { created_at: "desc" },
    });

    // Convert Decimal to number for type compatibility
    const debtors = debtorsRaw.map((debtor) => ({
      ...debtor,
      total_debt: debtor.total_debt.toNumber(),
    }));

    return NextResponse.json(debtors);
  } catch (error) {
    console.error("Error fetching debtors:", error);
    return NextResponse.json(
      { error: "Serverda xatolik yuz berdi" },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    // Get user session
    const session = await getSession();
    if (!session) {
      return NextResponse.json(
        { error: "Tizimga kirishda xatolik. Iltimos, qaytadan kiring." },
        { status: 401 }
      );
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

      return debtor;
    });

    return NextResponse.json(result, { status: 201 });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: "Ma'lumotlar noto'g'ri kiritilgan", details: error.errors },
        { status: 400 }
      );
    }

    console.error("Error creating debtor:", error);
    
    // Check for Prisma errors
    if (error && typeof error === 'object' && 'code' in error) {
      const prismaError = error as { code: string; meta?: any };
      
      if (prismaError.code === 'P2003') {
        return NextResponse.json(
          { error: "Tizimga kirishda xatolik. Iltimos, qaytadan kiring." },
          { status: 401 }
        );
      }
    }
    
    return NextResponse.json(
      { error: "Serverda xatolik yuz berdi" },
      { status: 500 }
    );
  }
}
