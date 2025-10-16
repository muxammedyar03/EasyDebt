import { NextRequest, NextResponse } from "next/server";

import { getSession } from "@/lib/auth";
import { getAuditLogs } from "@/lib/audit";

export async function GET(request: NextRequest) {
  try {
    const session = await getSession();
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Only admins can view audit logs
    if (session.role !== "ADMIN" && session.role !== "SUPER_ADMIN") {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const searchParams = request.nextUrl.searchParams;
    const entityType = searchParams.get("entityType") as "DEBTOR" | "DEBT" | "PAYMENT" | "USER" | "SETTINGS" | null;
    const entityId = searchParams.get("entityId");
    const limit = searchParams.get("limit");
    const offset = searchParams.get("offset");

    const logs = await getAuditLogs({
      entityType: entityType || undefined,
      entityId: entityId ? parseInt(entityId) : undefined,
      limit: limit ? parseInt(limit) : 50,
      offset: offset ? parseInt(offset) : 0,
    });

    return NextResponse.json({ logs });
  } catch (error) {
    console.error("Error fetching audit logs:", error);
    return NextResponse.json({ error: "Serverda xatolik yuz berdi" }, { status: 500 });
  }
}
