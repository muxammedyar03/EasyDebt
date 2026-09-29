import { hasPermission } from "@/lib/security/permission-access";
import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { requireClientId } from "@/lib/tenant";
import { prisma } from "@/lib/prisma";
import { Prisma } from "@prisma/client";

export async function GET(request: NextRequest) {
  try {
    const session = await getSession();
    if (session && !(await hasPermission(session, "audit.export"))) return NextResponse.json({ error: "Ruxsat yo‘q" }, { status: 403 });

    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const clientId = requireClientId(session);

    // Faqat SUPER_ADMIN va ADMIN export qila oladi
    if (session.role === "USER") {
      return NextResponse.json({ error: "Faqat admin foydalanuvchilar export qila oladi" }, { status: 403 });
    }

    // Get query parameters
    const searchParams = request.nextUrl.searchParams;
    const search = searchParams.get("search") || "";
    const action = searchParams.get("action") || "all";
    const entityType = searchParams.get("entityType") || "all";
    const dateFrom = searchParams.get("dateFrom") || "";
    const dateTo = searchParams.get("dateTo") || "";

    // Build where clause
    const where: Prisma.AuditLogWhereInput = {
      client_id: clientId,
    };

    if (search) {
      where.OR = [
        { action: { contains: search, mode: "insensitive" } },
        { entity_type: { contains: search, mode: "insensitive" } },
      ];
    }

    if (action !== "all") {
      where.action = { contains: action, mode: "insensitive" };
    }

    if (entityType !== "all") {
      where.entity_type = entityType;
    }

    if (dateFrom || dateTo) {
      where.created_at = {};
      if (dateFrom) {
        where.created_at.gte = new Date(dateFrom);
      }
      if (dateTo) {
        const endDate = new Date(dateTo);
        endDate.setHours(23, 59, 59, 999);
        where.created_at.lte = endDate;
      }
    }

    // Fetch all audit logs
    const auditLogs = await prisma.auditLog.findMany({
      where,
      orderBy: { created_at: "desc" },
    });

    // Get user names
    const userIds = [...new Set(auditLogs.map((log) => log.user_id).filter((id): id is number => id !== null))];
    const users = await prisma.user.findMany({
      where: {
        id: {
          in: userIds,
        },
      },
      select: {
        id: true,
        username: true,
        email: true,
        first_name: true,
        last_name: true,
      },
    });

    const userMap = new Map(users.map((user) => [user.id, user]));

    // Format data for export
    const exportData = auditLogs.map((log) => {
      const user = log.user_id ? userMap.get(log.user_id) : null;
      return {
        id: log.id,
        sana: log.created_at.toLocaleString("uz-UZ"),
        foydalanuvchi: user
          ? user.first_name && user.last_name
            ? `${user.first_name} ${user.last_name}`
            : user.username
          : "Tizim",
        email: user?.email || "-",
        harakat: log.action,
        entity_turi: log.entity_type,
        entity_id: log.entity_id || "-",
        ip_address: log.ip_address || "-",
      };
    });

    return NextResponse.json({ logs: exportData });
  } catch (error) {
    console.error("Export error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

