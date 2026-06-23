import { NextResponse } from "next/server";

import { clearAuthCookies, getSession } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { shouldUseMockData } from "@/lib/mock";

export async function POST() {
  const session = await getSession();
  try {
    const useMockData = await shouldUseMockData();

    if (session && !useMockData) {
      try {
        const user = await prisma.user.findUnique({
          where: { id: session.userId },
          select: { first_name: true, last_name: true, username: true },
        });

        const userFullName =
          user?.first_name && user?.last_name
            ? `${user.first_name} ${user.last_name}`
            : user?.username || "Foydalanuvchi";

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
            description: `${userFullName} tizimdan chiqdi`,
          },
        });
      } catch (auditError) {
        console.error("Logout audit log failed:", auditError);
      }
    }

    const response = NextResponse.json({ message: "Logout successful" });
    return clearAuthCookies(response);
  } catch (error) {
    console.error("Logout error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
