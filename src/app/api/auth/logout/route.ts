import { NextResponse } from "next/server";

import { clearAuthCookie, getSession } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function POST() {
  const session = await getSession();
  try {
    await clearAuthCookie();

    if (session) {
      // Get user info for description
      const user = await prisma.user.findUnique({
        where: { id: session.userId },
        select: { first_name: true, last_name: true, username: true },
      });

      const userFullName =
        user?.first_name && user?.last_name
          ? `${user.first_name} ${user.last_name}`
          : user?.username || "Foydalanuvchi";
      const description = `${userFullName} tizimdan chiqdi`;

      await prisma.auditLog.create({
        data: {
          user_id: session.userId,
          action: "LOGOUT",
          entity_type: "USER",
          new_value: {
            user_id: session.userId,
            username: session.username,
            email: session.email,
            role: session.role,
          },
          description,
        },
      });
    }

    return NextResponse.json({
      message: "Logout successful",
    });
  } catch (error) {
    console.error("Logout error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
