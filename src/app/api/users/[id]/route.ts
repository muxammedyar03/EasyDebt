import { NextRequest, NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/auth";
import { Prisma } from "@prisma/client";

export async function PATCH(request: NextRequest, { params }: { params: { id: string } }) {
  try {
    const session = await getSession();

    if (!session || session.role !== "SUPER_ADMIN") {
      return NextResponse.json({ error: "Ruxsat yo'q" }, { status: 403 });
    }

    const userId = parseInt(params.id);
    const body = await request.json();

    // Prepare update data
    const updateData: Prisma.UserUpdateInput = {};

    if (body.username !== undefined) updateData.username = body.username;
    if (body.email !== undefined) updateData.email = body.email || null;
    if (body.role !== undefined) updateData.role = body.role;
    if (body.first_name !== undefined) updateData.first_name = body.first_name || null;
    if (body.last_name !== undefined) updateData.last_name = body.last_name || null;
    if (body.is_active !== undefined) updateData.is_active = body.is_active;

    // Hash password if provided
    if (body.password) {
      if (body.password.length < 6) {
        return NextResponse.json({ error: "Parol kamida 6 ta belgidan iborat bo'lishi kerak" }, { status: 400 });
      }
      updateData.password = await bcrypt.hash(body.password, 10);
    }

    // Update user
    const user = await prisma.user.update({
      where: { id: userId },
      data: updateData,
      select: {
        id: true,
        username: true,
        email: true,
        role: true,
        first_name: true,
        last_name: true,
        is_active: true,
        updated_at: true,
      },
    });

    return NextResponse.json(user);
  } catch (error) {
    console.error("User update error:", error);

    // Type guard for Prisma errors
    if (error instanceof Prisma.PrismaClientKnownRequestError) {
      if (error.code === "P2002") {
        return NextResponse.json({ error: "Username yoki email allaqachon mavjud" }, { status: 400 });
      }
      if (error.code === "P2025") {
        return NextResponse.json({ error: "Foydalanuvchi topilmadi" }, { status: 404 });
      }
    }
    return NextResponse.json({ error: "Foydalanuvchini yangilashda xatolik" }, { status: 500 });
  }
}

export async function DELETE(request: NextRequest, { params }: { params: { id: string } }) {
  try {
    const session = await getSession();

    if (!session || session.role !== "SUPER_ADMIN") {
      return NextResponse.json({ error: "Ruxsat yo'q" }, { status: 403 });
    }

    const userId = parseInt(params.id);

    // Prevent deleting yourself
    if (session.userId === userId) {
      return NextResponse.json({ error: "O'zingizni o'chira olmaysiz" }, { status: 400 });
    }

    await prisma.user.delete({
      where: { id: userId },
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("User delete error:", error);
    if (error instanceof Prisma.PrismaClientKnownRequestError) {
      if (error.code === "P2025") {
        return NextResponse.json({ error: "Foydalanuvchi topilmadi" }, { status: 404 });
      }
      return NextResponse.json({ error: "Foydalanuvchini o'chirishda xatolik" }, { status: 500 });
    }
    return NextResponse.json({ error: "Foydalanuvchini o'chirishda xatolik" }, { status: 500 });
  }
}
