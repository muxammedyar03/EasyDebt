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

    // Get user info for description
    const user = await prisma.user.findUnique({
      where: { id: session.userId },
      select: { first_name: true, last_name: true, username: true },
    });

    const userFullName =
      user?.first_name && user?.last_name ? `${user.first_name} ${user.last_name}` : user?.username || "Foydalanuvchi";

    const debtorFullName = `${updatedDebtor.first_name} ${updatedDebtor.last_name}`;
    const description = `${userFullName} qarzdor ${debtorFullName} ma'lumotlarini yangiladi`;

    await prisma.auditLog.create({
      data: {
        user_id: session.userId,
        action: "UPDATE",
        entity_type: "DEBTOR",
        new_value: {
          debtor_id: debtorId,
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
    const debtor = await prisma.debtor.findUnique({
      where: { id: debtorId },
    });

    if (!debtor) {
      return NextResponse.json({ error: "Qarzdor topilmadi" }, { status: 404 });
    }

    // Get user info for description
    const user = await prisma.user.findUnique({
      where: { id: session.userId },
      select: { first_name: true, last_name: true, username: true },
    });

    const userFullName =
      user?.first_name && user?.last_name ? `${user.first_name} ${user.last_name}` : user?.username || "Foydalanuvchi";

    const debtorFullName = `${debtor.first_name} ${debtor.last_name}`;
    const description = `${userFullName} qarzdor ${debtorFullName} ni o'chirdi`;

    await prisma.auditLog.create({
      data: {
        user_id: session.userId,
        action: "DELETE",
        entity_type: "DEBTOR",
        new_value: {
          debtor_id: debtorId,
          first_name: debtor.first_name,
          last_name: debtor.last_name,
          phone_number: debtor.phone_number,
          address: debtor.address,
        },
        description,
        ip_address: request.headers.get("cf-connecting-ip") || "",
        user_agent: request.headers.get("user-agent") || "",
      },
    });

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
