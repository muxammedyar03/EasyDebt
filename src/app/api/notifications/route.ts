import { NextRequest, NextResponse } from "next/server";

import { getSession } from "@/lib/auth";
import { markAllNotificationsAsRead } from "@/lib/notifications";
import { prisma } from "@/lib/prisma";
import { NotificationType, Prisma } from "@prisma/client";

export async function GET(request: NextRequest) {
  try {
    const session = await getSession();
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const page = Math.max(parseInt(searchParams.get("page") ?? "1", 10) || 1, 1);
    const pageSize = Math.min(Math.max(parseInt(searchParams.get("pageSize") ?? "10", 10) || 10, 1), 50);
    const q = (searchParams.get("q") ?? "").trim();
    const type = (searchParams.get("type") ?? "").trim();
    const readParam = (searchParams.get("read") ?? "").trim();
    console.log(type);

    const where: Prisma.NotificationWhereInput = {};
    if (session.userId) {
      where.OR = [{ user_id: session.userId }, { user_id: null }];
    }
    if (q) {
      where.OR = [
        ...(where.OR ?? []),
        { title: { contains: q, mode: "insensitive" } },
        { message: { contains: q, mode: "insensitive" } },
      ];
    }
    if (type) {
      where.type = type as NotificationType;
    } else {
      where.type = { in: ["OVERDUE_PAYMENT", "DEBT_LIMIT_EXCEEDED", "HOSTING_REMINDER"] as NotificationType[] };
    }
    if (readParam === "true" || readParam === "false") {
      where.is_read = readParam === "true";
    }

    const [items, total] = await Promise.all([
      prisma.notification.findMany({
        where,
        orderBy: { created_at: "desc" },
        skip: (page - 1) * pageSize,
        take: pageSize,
      }),
      prisma.notification.count({ where }),
    ]);

    return NextResponse.json({ notifications: items, total, page, pageSize });
  } catch (error) {
    console.error("Error fetching notifications:", error);
    return NextResponse.json({ error: "Serverda xatolik yuz berdi" }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const session = await getSession();
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();
    const { action } = body;

    if (action === "mark_all_read") {
      await markAllNotificationsAsRead(session.userId);
      return NextResponse.json({ success: true });
    }

    return NextResponse.json({ error: "Invalid action" }, { status: 400 });
  } catch (error) {
    console.error("Error updating notifications:", error);
    return NextResponse.json({ error: "Serverda xatolik yuz berdi" }, { status: 500 });
  }
}
