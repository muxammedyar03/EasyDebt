import { NextRequest, NextResponse } from "next/server";

import { getSession } from "@/lib/auth";
import { requireClientId } from "@/lib/tenant";
import { getApiErrorMessage } from "@/lib/errors";
import { markAllNotificationsAsRead } from "@/lib/notifications";
import { buildHeaderNotificationsWhere, HEADER_NOTIFICATION_TYPES } from "@/lib/notifications/header-query";
import { NotificationType, Prisma } from "@prisma/client";
import { debtorRepository } from "@/entities/debtor/api";
import { notificationRepository } from "@/entities/notification/api";

export async function GET(request: NextRequest) {
  try {
    const session = await getSession();
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const clientId = requireClientId(session);

    const { searchParams } = new URL(request.url);
    const page = Math.max(parseInt(searchParams.get("page") ?? "1", 10) || 1, 1);
    const pageSize = Math.min(Math.max(parseInt(searchParams.get("pageSize") ?? "10", 10) || 10, 1), 50);
    const q = (searchParams.get("q") ?? "").trim();
    const type = (searchParams.get("type") ?? "").trim();
    const readParam = (searchParams.get("read") ?? "").trim();

    // Header preview: unread + default types — shared where builder
    const isHeaderPreview = !q && !type && readParam === "false";
    let where: Prisma.NotificationWhereInput;

    if (isHeaderPreview) {
      where = buildHeaderNotificationsWhere(clientId, session.userId, true);
    } else {
      where = { client_id: clientId };
      const andConditions: Prisma.NotificationWhereInput[] = [];

      if (session.userId) {
        andConditions.push({
          OR: [{ user_id: session.userId }, { user_id: null }],
        });
      }

      if (q) {
        andConditions.push({
          OR: [{ title: { contains: q, mode: "insensitive" } }, { message: { contains: q, mode: "insensitive" } }],
        });
      }

      if (andConditions.length > 0) {
        where.AND = andConditions;
      }

      if (type) {
        where.type = type as NotificationType;
      } else {
        where.type = { in: HEADER_NOTIFICATION_TYPES };
      }

      if (readParam === "true" || readParam === "false") {
        where.is_read = readParam === "true";
      }
    }

    const [itemsRaw, total] = await Promise.all([
      notificationRepository.findMany(where, {
        orderBy: { created_at: "desc" },
        skip: (page - 1) * pageSize,
        take: pageSize,
      }),
      notificationRepository.count(where),
    ]);

    const debtorIds = [...new Set(itemsRaw.map((n) => n.debtor_id).filter(Boolean))] as number[];
    const idToExternalId = new Map<number, string>();
    if (debtorIds.length > 0) {
      const debtors = await debtorRepository.findMany(
        { id: { in: debtorIds }, client_id: clientId },
        { take: debtorIds.length },
      );
      debtors.forEach((d) => idToExternalId.set(d.id, d.external_id));
    }
    const notifications = itemsRaw.map((n) => ({
      ...n,
      debtor_external_id: n.debtor_id ? (idToExternalId.get(n.debtor_id) ?? null) : null,
    }));

    return NextResponse.json({ notifications, total, page, pageSize });
  } catch (error) {
    console.error("Error fetching notifications:", error);
    return NextResponse.json({ error: getApiErrorMessage(error) }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const session = await getSession();
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    requireClientId(session);

    const body = await request.json();
    const { action } = body;

    if (action === "mark_all_read") {
      await markAllNotificationsAsRead(session.userId);
      return NextResponse.json({ success: true });
    }

    return NextResponse.json({ error: "Invalid action" }, { status: 400 });
  } catch (error) {
    console.error("Error updating notifications:", error);
    return NextResponse.json({ error: getApiErrorMessage(error) }, { status: 500 });
  }
}
