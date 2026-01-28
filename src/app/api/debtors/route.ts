import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/auth";
import { getEffectiveShopId } from "@/lib/shop-context";
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

    // Import overdue calculator for accurate is_overdue calculation
    const { calculateDebtorOverdueStatus } = await import("@/lib/overdue-calculator");
    const settings = await debtorService.getOverdueDays();

    const debtorsRaw = await prisma.debtor.findMany({
      where: { shop_id: shopId },
      orderBy: { created_at: "desc" },
      include: {
        debts: true,
        payments: true,
      },
    });

    // Convert Decimal to number and calculate accurate is_overdue
    const debtors = debtorsRaw.map((debtor) => {
      // Calculate isOverdue using the accurate function
      const debtsWithPayments = debtor.debts.map((debt) => ({
        amount: debt.amount.toNumber(),
        createdAt: debt.created_at,
        payments: debtor.payments
          .filter((p) => p.created_at >= debt.created_at)
          .map((p) => ({
            amount: p.amount.toNumber(),
            createdAt: p.created_at,
          })),
      }));

      const overdueStatus = calculateDebtorOverdueStatus(debtsWithPayments, {
        goodUntilDays: settings - 15,
        mediumUntilDays: settings,
        minPaidPercent: 0.5,
      });

      return {
        ...debtor,
        total_debt: debtor.total_debt.toNumber(),
        is_overdue: overdueStatus.isOverdue,
      };
    });

    return NextResponse.json(debtors);
  } catch (error) {
    console.error("Error fetching debtors:", error);
    return NextResponse.json({ error: "Serverda xatolik yuz berdi" }, { status: 500 });
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

    // Get effective shop ID
    const shopId = getEffectiveShopId(session);
    if (!shopId) {
      return NextResponse.json({ error: "Shop context not found" }, { status: 400 });
    }

    // Use transaction to create debtor and debt together
    const result = await prisma.$transaction(async (tx) => {
      const debtor = await tx.debtor.create({
        data: {
          first_name: validatedData.first_name,
          last_name: validatedData.last_name,
          phone_number: validatedData.phone_number || null,
          address: validatedData.address || null,
          total_debt: validatedData.debt_amount || 0,
          shop_id: shopId,
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
            shop_id: shopId,
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

    // Check for Prisma errors
    if (error && typeof error === "object" && "code" in error) {
      const prismaError = error as { code: string; meta?: Prisma.PrismaClientKnownRequestError };

      if (prismaError.code === "P2003") {
        return NextResponse.json({ error: "Tizimga kirishda xatolik. Iltimos, qaytadan kiring." }, { status: 401 });
      }
    }

    return NextResponse.json({ error: "Serverda xatolik yuz berdi" }, { status: 500 });
  }
}
