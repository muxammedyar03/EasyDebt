import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";

import { applyAuthCookie, clearGuestDemoCookieOnResponse, signToken } from "@/lib/auth";
import { verifyPassword } from "@/lib/password";
import { prisma } from "@/lib/prisma";
import { isMockMode, mockFindUserByUsername, mockVerifyPassword } from "@/lib/mock";

const loginSchema = z.object({
  username: z.string().min(1),
  password: z.string().min(1),
});

function isUserAccountActive(user: { is_active?: boolean; status?: string }): boolean {
  if (user.status !== undefined) {
    return user.status === "ACTIVE";
  }
  return user.is_active ?? true;
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const validatedData = loginSchema.parse(body);

    const useMockData = isMockMode();

    const user = useMockData
      ? mockFindUserByUsername(validatedData.username)
      : await prisma.user.findUnique({
          where: { username: validatedData.username },
        });

    if (!user) {
      return NextResponse.json({ error: "Invalid credentials" }, { status: 401 });
    }

    if (!isUserAccountActive(user)) {
      return NextResponse.json({ error: "Account is disabled" }, { status: 403 });
    }

    const isValidPassword = useMockData
      ? mockVerifyPassword(validatedData.password, user.password)
      : await verifyPassword(validatedData.password, user.password);

    if (!isValidPassword) {
      return NextResponse.json({ error: "Invalid credentials" }, { status: 401 });
    }

    const token = await signToken({
      userId: user.id,
      username: user.username,
      email: user.email,
      role: user.role,
    });

    const response = NextResponse.json({
      message: "Login successful",
      user: {
        id: user.id,
        username: user.username,
        email: user.email,
        role: user.role,
        first_name: user.first_name,
        last_name: user.last_name,
      },
    });

    clearGuestDemoCookieOnResponse(response);
    applyAuthCookie(response, token);

    if (!useMockData) {
      const userFullName = user.first_name && user.last_name ? `${user.first_name} ${user.last_name}` : user.username;
      try {
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
            description: `${userFullName} tizimga kirdi`,
            ip_address: req.headers.get("cf-connecting-ip") || "",
            user_agent: req.headers.get("user-agent") || "",
          },
        });
      } catch (auditError) {
        console.error("Login audit log failed:", auditError);
      }
    }

    return response;
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: "Validation error", details: error.errors }, { status: 400 });
    }

    console.error("Login error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
