import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/auth";
import { z } from "zod";

const updateDebtorSchema = z.object({
  first_name: z.string().min(1).optional(),
  last_name: z.string().min(1).optional(),
  phone_number: z.string().nullable().optional(),
  address: z.string().nullable().optional(),
});

// GET single debtor
export async function GET(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const session = await getSession();
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id } = await params;
    const debtorId = parseInt(id);
    if (isNaN(debtorId)) {
      return NextResponse.json({ error: "Noto'g'ri ID" }, { status: 400 });
    }

    const debtor = await prisma.debtor.findUnique({
      where: { id: debtorId },
      include: {
        debts: {
          orderBy: { created_at: "desc" },
        },
        payments: {
          orderBy: { created_at: "desc" },
        },
      },
    });

    if (!debtor) {
      return NextResponse.json({ error: "Qarzdor topilmadi" }, { status: 404 });
    }

    // Convert Decimal to number
    const debtorData = {
      ...debtor,
      total_debt: debtor.total_debt.toNumber(),
      debts: debtor.debts.map((debt) => ({
        ...debt,
        amount: debt.amount.toNumber(),
      })),
      payments: debtor.payments.map((payment) => ({
        ...payment,
        amount: payment.amount.toNumber(),
      })),
    };

    return NextResponse.json(debtorData);
  } catch (error) {
    console.error("Error fetching debtor:", error);
    return NextResponse.json({ error: "Serverda xatolik yuz berdi" }, { status: 500 });
  }
}

// UPDATE debtor
export async function PATCH(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const session = await getSession();
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id } = await params;
    const debtorId = parseInt(id);
    if (isNaN(debtorId)) {
      return NextResponse.json({ error: "Noto'g'ri ID" }, { status: 400 });
    }

    const body = await request.json();
    const validatedData = updateDebtorSchema.parse(body);

    const updatedDebtor = await prisma.debtor.update({
      where: { id: debtorId },
      data: validatedData,
    });

    return NextResponse.json({
      ...updatedDebtor,
      total_debt: updatedDebtor.total_debt.toNumber(),
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: "Ma'lumotlar noto'g'ri kiritilgan", details: error.errors }, { status: 400 });
    }

    console.error("Error updating debtor:", error);
    return NextResponse.json({ error: "Serverda xatolik yuz berdi" }, { status: 500 });
  }
}

// DELETE debtor
export async function DELETE(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const session = await getSession();
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id } = await params;
    const debtorId = parseInt(id);
    if (isNaN(debtorId)) {
      return NextResponse.json({ error: "Noto'g'ri ID" }, { status: 400 });
    }

    // Delete debtor (cascade will delete related debts and payments)
    await prisma.debtor.delete({
      where: { id: debtorId },
    });

    return NextResponse.json({ message: "Qarzdor o'chirildi" });
  } catch (error) {
    console.error("Error deleting debtor:", error);
    return NextResponse.json({ error: "Serverda xatolik yuz berdi" }, { status: 500 });
  }
}
