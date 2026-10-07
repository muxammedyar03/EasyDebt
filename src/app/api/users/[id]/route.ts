import { hasPermission } from "@/lib/security/permission-access";
import { takePinAttempt } from "@/lib/security/rate-limit";
import { NextRequest, NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { prisma } from "@/lib/prisma";
import { getSession, setAuthCookie, signToken } from "@/lib/auth";
import { requireClientId } from "@/lib/tenant";
import { Prisma } from "@prisma/client";
import { createRequiredAuditLog } from "@/lib/audit";
import { userAuditFields } from "@/lib/user-audit";
import { serializableTransaction } from "@/lib/security/serializable";

export async function GET(_request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const session = await getSession();
    if (session && session.userId !== Number(id) && !(await hasPermission(session, "users.view")))
      return NextResponse.json({ error: "Ruxsat yo‘q" }, { status: 403 });
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const clientId = requireClientId(session);
    const userId = parseInt(id);
    const user = await prisma.user.findFirst({
      where: { id: userId, client_id: clientId },
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

    if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const userId = parseInt(id);
    const body = await request.json();
    const clientId = requireClientId(session);
    if (!Number.isSafeInteger(userId) || userId <= 0)
      return NextResponse.json({ error: "Invalid user" }, { status: 400 });

    // PIN-specific actions (verify/set/change/reset)
    if (body?.action) {
      const action = body.action as string;
      if (session.userId !== userId) return NextResponse.json({ error: "Forbidden" }, { status: 403 });
      if (!["verify_pin", "set_pin", "change_pin", "reset_pin"].includes(action))
        return NextResponse.json({ error: "Invalid action" }, { status: 400 });
      if (!(await takePinAttempt(session.userId)))
        return NextResponse.json(
          { error: "Too many PIN attempts. Try again later." },
          { status: 429, headers: { "Retry-After": "900" } },
        );

      // Load target user
      const targetUser = await prisma.user.findFirst({
        where: { id: userId, client_id: clientId, is_active: true },
        select: { id: true, pin: true, role: true },
      });
      if (!targetUser) {
        return NextResponse.json({ error: "Foydalanuvchi topilmadi" }, { status: 404 });
      }

      // verify_pin: check provided pin
      if (action === "verify_pin") {
        if (typeof body.pin !== "string" || !/^\d{4,6}$/.test(body.pin))
          return NextResponse.json({ error: "Pin kerak" }, { status: 400 });
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
        const result = await prisma.user.updateMany({
          where: { id: userId, client_id: clientId, pin: null },
          data: { pin: hashed },
        });
        if (result.count !== 1) return NextResponse.json({ error: "PIN already set; use change PIN" }, { status: 409 });
        await setAuthCookie(await signToken(session));
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
        await prisma.user.update({ where: { id: userId, client_id: clientId }, data: { pin: hashed } });
        await setAuthCookie(await signToken(session));
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
          where: {
            id: session.userId,
            is_active: true,
            client: { is_active: true },
            OR: [{ username: login }, { email: login }],
          },
          select: { id: true, password: true, role: true },
        });
        if (!authUser) return NextResponse.json({ error: "Login yoki parol noto'g'ri" }, { status: 401 });
        const passOk = await bcrypt.compare(password, authUser.password);
        if (!passOk) return NextResponse.json({ error: "Login yoki parol noto'g'ri" }, { status: 401 });
        // PIN reset is self-service after re-authentication; no cross-account bypass.
        if (authUser.id !== userId) {
          return NextResponse.json({ error: "Ruxsat yo'q" }, { status: 403 });
        }
        if (!/^\d{4,6}$/.test(nextPin))
          return NextResponse.json({ error: "Yangi pin 4-6 raqam bo'lishi kerak" }, { status: 400 });
        const hashed = await bcrypt.hash(nextPin, 10);
        await prisma.user.update({ where: { id: userId, client_id: clientId }, data: { pin: hashed } });
        await setAuthCookie(await signToken(session));
        return NextResponse.json({ ok: true });
      }

      return NextResponse.json({ error: "Noma'lum action" }, { status: 400 });
    }

    if (!(await hasPermission(session, "users.edit")))
      return NextResponse.json({ error: "Ruxsat yo‘q" }, { status: 403 });

    if (!session) {
      return NextResponse.json({ error: "Ruxsat yo'q" }, { status: 403 });
    }

    const isSuperAdmin = session.role === "SUPER_ADMIN";
    const isAdmin = session.role === "ADMIN";

    if (!isSuperAdmin && !isAdmin) {
      return NextResponse.json({ error: "Ruxsat yo'q" }, { status: 403 });
    }

    const targetUser = await prisma.user.findFirst({
      where: { id: userId, client_id: clientId! },
      select: { id: true, role: true },
    });

    if (!targetUser) {
      return NextResponse.json({ error: "Foydalanuvchi topilmadi" }, { status: 404 });
    }

    // ADMIN: only toggle is_active within own client
    if (isAdmin && !isSuperAdmin) {
      const bodyKeys = Object.keys(body).filter((key) => body[key] !== undefined);
      const hasOnlyActiveToggle = bodyKeys.length === 1 && bodyKeys[0] === "is_active";

      if (!hasOnlyActiveToggle || typeof body.is_active !== "boolean" || userId === session.userId) {
        return NextResponse.json({ error: "Ruxsat yo'q" }, { status: 403 });
      }

      if (body.role === "SUPER_ADMIN" || targetUser.role === "SUPER_ADMIN") {
        return NextResponse.json({ error: "Ruxsat yo'q" }, { status: 403 });
      }

      const user = await serializableTransaction(async (tx) => {
        const before = await tx.user.findFirstOrThrow({ where: { id: userId, client_id: clientId } });
        if (before.role === "SUPER_ADMIN") throw new Error("Forbidden user role");
        const updated = await tx.user.update({
          where: { id: userId },
          data: { is_active: body.is_active },
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
        await createRequiredAuditLog(tx, {
          clientId,
          userId: session.userId,
          action: "UPDATE",
          entityType: "USER",
          entityId: userId,
          oldValue: userAuditFields(before),
          newValue: userAuditFields(updated),
          description: `Xodim ${updated.username} faolligi o‘zgartirildi`,
        });
        return updated;
      });

      return NextResponse.json(user);
    }

    if (!isSuperAdmin) {
      return NextResponse.json({ error: "Ruxsat yo'q" }, { status: 403 });
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
    const user = await serializableTransaction(async (tx) => {
      const before = await tx.user.findFirstOrThrow({ where: { id: userId, client_id: clientId } });
      const updated = await tx.user.update({
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
      await createRequiredAuditLog(tx, {
        clientId,
        userId: session.userId,
        action: "UPDATE",
        entityType: "USER",
        entityId: userId,
        oldValue: userAuditFields(before),
        newValue: { ...userAuditFields(updated), ...(body.password ? { security_changed: true } : {}) },
        description: `Xodim ${updated.username} ma’lumotlari o‘zgartirildi`,
      });
      return updated;
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
    if (session && !(await hasPermission(session, "users.delete")))
      return NextResponse.json({ error: "Ruxsat yo‘q" }, { status: 403 });

    if (!session || session.role !== "SUPER_ADMIN") {
      return NextResponse.json({ error: "Ruxsat yo'q" }, { status: 403 });
    }

    const userId = parseInt(id, 10);

    // Prevent deleting yourself
    if (session.userId === userId) {
      return NextResponse.json({ error: "O'zingizni o'chira olmaysiz" }, { status: 400 });
    }

    const clientId = requireClientId(session);
    await prisma.$transaction(async (tx) => {
      const before = await tx.user.findFirstOrThrow({ where: { id: userId, client_id: clientId } });
      await tx.user.delete({ where: { id: userId, client_id: clientId } });
      await createRequiredAuditLog(tx, {
        clientId,
        userId: session.userId,
        action: "DELETE",
        entityType: "USER",
        entityId: userId,
        oldValue: userAuditFields(before),
        description: `Xodim ${before.username} o‘chirildi`,
      });
    });

    return NextResponse.json({ message: "Foydalanuvchi muvaffaqiyatli o'chirildi" }, { status: 200 });
  } catch (error) {
    console.error("Error deleting user:", error);

    if (error instanceof Prisma.PrismaClientKnownRequestError) {
      if (error.code === "P2025") {
        return NextResponse.json({ error: "Foydalanuvchi topilmadi" }, { status: 404 });
      }
      // Foreign key constraint: user has related debtors, debts, payments, reminders, etc.
      if (error.code === "P2003") {
        return NextResponse.json(
          {
            error:
              "Foydalanuvchini o'chirib bo'lmaydi: unga bog'liq ma'lumotlar (qarzdorlar, qarzlar, to'lovlar yoki eslatmalar) mavjud.",
          },
          { status: 409 },
        );
      }
    }

    return NextResponse.json({ error: "Foydalanuvchini o'chirishda xatolik yuz berdi" }, { status: 500 });
  }
}
