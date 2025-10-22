import { type NextRequest, NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/auth";
import { Prisma, UserRole } from "@prisma/client";

type RouteParams = {
  params: Promise<{
    id: string;
  }>;
};

type UpdateUserData = {
  username?: string;
  email?: string | null;
  role?: string;
  first_name?: string | null;
  last_name?: string | null;
  is_active?: boolean;
  password?: string;
};

export async function PATCH(request: NextRequest, { params }: RouteParams): Promise<NextResponse> {
  try {
    const session = await getSession();

    if (!session || session.role !== "SUPER_ADMIN") {
      return NextResponse.json({ error: "Ruxsat yo'q" }, { status: 403 });
    }

    const resolvedParams = await params;
    const userId = parseInt(resolvedParams.id, 10);
    const body = (await request.json()) as UpdateUserData;

    // Prepare update data
    const updateData: Prisma.UserUpdateInput = {};

    // Update only the fields that are provided
    if ("username" in body) {
      updateData.username = body.username;
    }
    if ("email" in body) {
      updateData.email = body.email;
    }
    if ("role" in body) {
      updateData.role = body.role as UserRole;
    }
    if ("first_name" in body) {
      updateData.first_name = body.first_name;
    }
    if ("last_name" in body) {
      updateData.last_name = body.last_name;
    }
    if ("is_active" in body) {
      updateData.is_active = body.is_active;
    }

    if (body.password) {
      if (body.password.length < 6) {
        return NextResponse.json({ error: "Parol kamida 6 ta belgidan iborat bo'lishi kerak" }, { status: 400 });
      }
      updateData.password = await bcrypt.hash(body.password, 10);
    }

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

export async function DELETE(request: NextRequest, { params }: RouteParams): Promise<NextResponse> {
  try {
    const session = await getSession();

    if (!session || session.role !== "SUPER_ADMIN") {
      return NextResponse.json({ error: "Ruxsat yo'q" }, { status: 403 });
    }

    const resolvedParams = await params;
    const userId = parseInt(resolvedParams.id, 10);

    // Prevent deleting yourself
    if (session.userId === userId) {
      return NextResponse.json({ error: "O'zingizni o'chira olmaysiz" }, { status: 400 });
    }

    await prisma.user.delete({
      where: { id: userId },
    });

    return NextResponse.json({ message: "Foydalanuvchi muvaffaqiyatli o'chirildi" }, { status: 200 });
  } catch (error) {
    console.error("Error deleting user:", error);

    if (error instanceof Prisma.PrismaClientKnownRequestError) {
      if (error.code === "P2025") {
        return NextResponse.json({ error: "Foydalanuvchi topilmadi" }, { status: 404 });
      }
    }

    return NextResponse.json({ error: "Foydalanuvchini o'chirishda xatolik yuz berdi" }, { status: 500 });
  }
}
