import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { UserStatus } from "@prisma/client";

import { setAuthCookie, signToken } from "@/lib/auth";
import { verifyPassword } from "@/lib/password";
import { prisma } from "@/lib/prisma";

const loginSchema = z.object({
  username: z.string().min(1),
  password: z.string().min(1),
});

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const validatedData = loginSchema.parse(body);

    // Find user by username with shop info
    const user = await prisma.user.findUnique({
      where: { username: validatedData.username },
      include: {
        shop: {
          select: {
            id: true,
            name: true,
            is_active: true,
          },
        },
      },
    });

    if (!user) {
      return NextResponse.json({ error: "Invalid credentials" }, { status: 401 });
    }

    // Check user status
    if (user.status === UserStatus.BLOCKED) {
      return NextResponse.json({ error: "Account is blocked. Please contact administrator." }, { status: 403 });
    }

    if (user.status === UserStatus.DEACTIVATED) {
      return NextResponse.json({ error: "Account is deactivated" }, { status: 403 });
    }

    // Check if shop is active (for non-super admins)
    if (user.shop_id && user.shop && !user.shop.is_active) {
      return NextResponse.json(
        { error: "Your shop is currently inactive. Please contact administrator." },
        { status: 403 },
      );
    }

    // Verify password
    const isValidPassword = await verifyPassword(validatedData.password, user.password);

    if (!isValidPassword) {
      return NextResponse.json({ error: "Invalid credentials" }, { status: 401 });
    }

    // For SUPER_ADMIN, get first active shop as default
    let activeShopId: number | null = null;
    if (user.role === "SUPER_ADMIN") {
      const firstShop = await prisma.shop.findFirst({
        where: { is_active: true },
        orderBy: { id: "asc" },
      });
      activeShopId = firstShop?.id || null;
    }

    // Generate JWT token with shop context
    const token = await signToken({
      userId: user.id,
      username: user.username,
      email: user.email,
      role: user.role,
      shopId: user.shop_id,
      activeShopId: user.role === "SUPER_ADMIN" ? activeShopId : undefined,
      status: user.status,
    });

    // Set HTTP-only cookie
    await setAuthCookie(token);

    const userFullName = user.first_name && user.last_name ? `${user.first_name} ${user.last_name}` : user.username;
    const description = `${userFullName} tizimga kirdi`;

    await prisma.auditLog.create({
      data: {
        user_id: user.id,
        action: "LOGIN",
        entity_type: "USER",
        new_value: {
          user_id: user.id,
          username: user.username,
          email: user.email,
          role: user.role,
        },
        description,
        ip_address: req.headers.get("cf-connecting-ip") || "",
        user_agent: req.headers.get("user-agent") || "",
      },
    });

    return NextResponse.json({
      message: "Login successful",
      user: {
        id: user.id,
        username: user.username,
        email: user.email,
        role: user.role,
        status: user.status,
        first_name: user.first_name,
        last_name: user.last_name,
        shop_id: user.shop_id,
        shop_name: user.shop?.name || null,
        active_shop_id: activeShopId,
        needs_shop_selection: user.role === "SUPER_ADMIN" && !activeShopId,
      },
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: "Validation error", details: error.errors }, { status: 400 });
    }

    console.error("Login error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
