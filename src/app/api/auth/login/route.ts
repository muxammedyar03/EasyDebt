import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";

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

    // Find user by username
    const user = await prisma.user.findUnique({
      where: { username: validatedData.username },
      include: { client: { select: { is_active: true } } },
    });

    if (!user) {
      return NextResponse.json({ error: "Invalid credentials" }, { status: 401 });
    }

    // Check if user is active
    if (!user.is_active || !user.client.is_active) {
      return NextResponse.json({ error: "Account is disabled" }, { status: 403 });
    }

    // Verify password
    const isValidPassword = await verifyPassword(validatedData.password, user.password);

    if (!isValidPassword) {
      return NextResponse.json({ error: "Invalid credentials" }, { status: 401 });
    }

    // Generate JWT token
    const token = await signToken({
      userId: user.id,
      username: user.username,
      email: user.email,
      role: user.role,
      clientId: user.client_id,
    });

    // Set HTTP-only cookie
    await setAuthCookie(token);

    const userFullName = user.first_name && user.last_name ? `${user.first_name} ${user.last_name}` : user.username;
    const description = `${userFullName} tizimga kirdi`;

    await prisma.auditLog.create({
      data: {
        user_id: user.id,
        client_id: user.client_id,
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
        first_name: user.first_name,
        last_name: user.last_name,
        client_id: user.client_id,
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
