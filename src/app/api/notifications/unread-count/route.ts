import { hasPermission } from "@/lib/security/permission-access";
import { NextResponse } from "next/server";

import { getSession } from "@/lib/auth";
import { requireClientId } from "@/lib/tenant";
import { getApiErrorMessage } from "@/lib/errors";
import { buildHeaderNotificationsWhere } from "@/lib/notifications/header-query";
import { notificationRepository } from "@/entities/notification/api";

export async function GET() {
  try {
    const session = await getSession();
    if (session && !(await hasPermission(session, "notifications.view"))) return NextResponse.json({ error: "Ruxsat yo‘q" }, { status: 403 });
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const clientId = requireClientId(session);

    const count = await notificationRepository.count(buildHeaderNotificationsWhere(clientId, session.userId, true));

    return NextResponse.json({ count });
  } catch (error) {
    console.error("Error fetching unread notification count:", error);
    return NextResponse.json({ error: getApiErrorMessage(error) }, { status: 500 });
  }
}

