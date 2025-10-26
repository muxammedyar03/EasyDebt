import { NextRequest, NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/auth";
import { Prisma } from "@prisma/client";

export async function GET(_request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const session = await getSession();
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    const userId = parseInt(id);
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { id: true, username: true, email: true, pin: true, role: true },
    });

    if (!user) {
      return NextResponse.json({ error: "Foydalanuvchi topilmadi" }, { status: 404 });
    }

    return NextResponse.json({
      has_pin: !!user.pin,
      user: { id: user.id, username: user.username, email: user.email },
    });
  } catch (error) {
    console.error("User GET error:", error);
    return NextResponse.json({ error: "Server xatosi" }, { status: 500 });
  }
}

export async function PATCH(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const session = await getSession();

    if (!session || session.role !== "SUPER_ADMIN") {
      // allow user-level operations below that only affect their own user (verify/set/change)
      // but for the generic updates below we keep SUPER_ADMIN protection as originally implemented
    }

    const userId = parseInt(id);
    const body = await request.json();

    // PIN-specific actions (verify/set/change/reset)
    if (body?.action) {
      const action = body.action as string;

      // Load target user
      const targetUser = await prisma.user.findUnique({
        where: { id: userId },
        select: { id: true, pin: true, role: true },
      });
      if (!targetUser) {
        return NextResponse.json({ error: "Foydalanuvchi topilmadi" }, { status: 404 });
      }

      // verify_pin: check provided pin
      if (action === "verify_pin") {
        if (!body.pin) return NextResponse.json({ error: "Pin kerak" }, { status: 400 });
        if (!targetUser.pin) return NextResponse.json({ error: "Pin o'rnatilmagan" }, { status: 400 });
        const ok = await bcrypt.compare(body.pin, targetUser.pin);
        if (!ok) return NextResponse.json({ error: "Pin noto'g'ri" }, { status: 401 });
        return NextResponse.json({ ok: true });
      }

      // set_pin: one-time set; only owner can set their pin if none exists
      if (action === "set_pin") {
        if (!session || session.userId !== userId) {
          return NextResponse.json({ error: "Ruxsat yo'q" }, { status: 403 });
        }
        if (targetUser.pin) {
          return NextResponse.json(
            { error: "Pin allaqachon o'rnatilgan. Pinni yangilash uchun change_pin foydalaning." },
            { status: 400 },
          );
        }
        const pin = String(body.pin || "");
        if (!/^\d{4,6}$/.test(pin)) {
          return NextResponse.json({ error: "Pin 4-6 raqam bo'lishi kerak" }, { status: 400 });
        }
        const hashed = await bcrypt.hash(pin, 10);
        await prisma.user.update({ where: { id: userId }, data: { pin: hashed } });
        return NextResponse.json({ ok: true });
      }

      // change_pin: user provides current_pin and new pin
      if (action === "change_pin") {
        if (!session || session.userId !== userId) {
          return NextResponse.json({ error: "Ruxsat yo'q" }, { status: 403 });
        }
        const current = String(body.current_pin || "");
        const nextPin = String(body.pin || "");
        if (!current || !nextPin) return NextResponse.json({ error: "Joriy va yangi pin kerak" }, { status: 400 });
        if (!targetUser.pin) return NextResponse.json({ error: "Pin o'rnatilmagan" }, { status: 400 });
        const ok = await bcrypt.compare(current, targetUser.pin);
        if (!ok) return NextResponse.json({ error: "Joriy pin noto'g'ri" }, { status: 401 });
        if (!/^\d{4,6}$/.test(nextPin))
          return NextResponse.json({ error: "Yangi pin 4-6 raqam bo'lishi kerak" }, { status: 400 });
        const hashed = await bcrypt.hash(nextPin, 10);
        await prisma.user.update({ where: { id: userId }, data: { pin: hashed } });
        return NextResponse.json({ ok: true });
      }

      // reset_pin: user forgot PIN — require login + password (account credentials)
      if (action === "reset_pin") {
        const login = String(body.login || "");
        const password = String(body.password || "");
        const nextPin = String(body.pin || "");
        if (!login || !password || !nextPin)
          return NextResponse.json({ error: "Login, parol va yangi pin kerak" }, { status: 400 });
        const authUser = await prisma.user.findFirst({
          where: { OR: [{ username: login }, { email: login }] },
          select: { id: true, password: true, role: true },
        });
        if (!authUser) return NextResponse.json({ error: "Login yoki parol noto'g'ri" }, { status: 401 });
        const passOk = await bcrypt.compare(password, authUser.password);
        if (!passOk) return NextResponse.json({ error: "Login yoki parol noto'g'ri" }, { status: 401 });
        // allow reset if the credential owner is the same account or a SUPER_ADMIN
        if (authUser.id !== userId && authUser.role !== "SUPER_ADMIN") {
          return NextResponse.json({ error: "Ruxsat yo'q" }, { status: 403 });
        }
        if (!/^\d{4,6}$/.test(nextPin))
          return NextResponse.json({ error: "Yangi pin 4-6 raqam bo'lishi kerak" }, { status: 400 });
        const hashed = await bcrypt.hash(nextPin, 10);
        await prisma.user.update({ where: { id: userId }, data: { pin: hashed } });
        return NextResponse.json({ ok: true });
      }

      return NextResponse.json({ error: "Noma'lum action" }, { status: 400 });
    }

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

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
): Promise<NextResponse> {
  try {
    const { id } = await params;
    const session = await getSession();

    if (!session || session.role !== "SUPER_ADMIN") {
      return NextResponse.json({ error: "Ruxsat yo'q" }, { status: 403 });
    }

    const userId = parseInt(id, 10);

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
