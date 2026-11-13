import { hasPermission } from "@/lib/security/permission-access";
import { undoableAuditIds } from "@/lib/audit-undo";
import { cancellableAuditIds } from "@/lib/audit-cancel";
import { prisma } from "@/lib/prisma";
import { getTranslations } from "next-intl/server";
import { AuditLogsTable } from "./_components/audit-logs-table";
import { AuditLog, Prisma } from "@prisma/client";
import { AuditLogTableProps } from "@/types/types";
import { getSession } from "@/lib/auth";
import { requireClientId } from "@/lib/tenant";
import { redirect } from "next/navigation";
import { auditLogService } from "@/lib/services/audit-log.service";

export const dynamic = "force-dynamic";
export const revalidate = 0;

export default async function AuditLogsPage({
  searchParams,
}: {
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>;
}) {
  const session = await getSession();
  if (!session) redirect("/auth/login");
  if (!(await hasPermission(session, "audit.view"))) redirect("/unauthorized");
  const clientId = requireClientId(session);

  const t = await getTranslations("audit");
  const params = await searchParams;
  const page = Number(params.page) || 1;
  const limit = Number(params.limit) || 50;
  const search = (params.search as string) || "";
  const action = (params.action as string) || "";
  const entityType = (params.entityType as string) || "";
  const dateFrom = (params.dateFrom as string) || "";
  const dateTo = (params.dateTo as string) || "";

  // Build where clause
  const where: Prisma.AuditLogWhereInput = {
    client_id: clientId,
  };

  // Search filter (user, action, entity)
  if (search) {
    where.OR = [
      { action: { contains: search, mode: "insensitive" } },
      { entity_type: { contains: search, mode: "insensitive" } },
    ];
  }

  // Action filter - support multiple actions
  if (action) {
    const actions = action.split(",").filter(Boolean);
    if (actions.length > 0) {
      where.action = { in: actions };
    }
  }

  // Entity type filter - support multiple entity types
  if (entityType) {
    const entityTypes = entityType.split(",").filter(Boolean);
    if (entityTypes.length > 0) {
      where.entity_type = { in: entityTypes };
    }
  }

  // Date range filter
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

  // Get total count
  const totalCount = await prisma.auditLog.count({ where });
  const totalPages = Math.ceil(totalCount / limit);

  // Get paginated logs
  const auditLogs = await prisma.auditLog.findMany({
    where,
    orderBy: {
      created_at: "desc",
    },
    skip: (page - 1) * limit,
    take: limit,
  });
  const undoableIds = await undoableAuditIds(
    clientId,
    auditLogs,
    await hasPermission(session, "audit.undo"),
    session.role,
  );
  const cancellableIds = await cancellableAuditIds(clientId, auditLogs, await hasPermission(session, "audit.cancel"));

  // Get user names
  const userIds = [...new Set(auditLogs.map((log: AuditLog) => log.user_id).filter((id): id is number => id !== null))];
  const [users, presentations] = await Promise.all([
    prisma.user.findMany({
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
    }),
    auditLogService.getLogPresentations(clientId, auditLogs),
  ]);

  const userMap = new Map(users.map((user) => [user.id, user]));

  const logsWithUsers = auditLogs.map((log) => ({
    ...log,
    user: log.user_id ? userMap.get(log.user_id) || null : null,
    subjectName: presentations.get(log.id)?.subjectName ?? null,
    amount: presentations.get(log.id)?.amount ?? null,
    displayEntityType: presentations.get(log.id)?.displayEntityType ?? log.entity_type,
    sourceAction: presentations.get(log.id)?.sourceAction ?? null,
  }));

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl font-bold tracking-tight sm:text-2xl">{t("title")}</h1>
        <p className="text-muted-foreground">{t("subtitle")}</p>
      </div>

      <AuditLogsTable
        logs={logsWithUsers as AuditLogTableProps[]}
        totalPages={totalPages}
        currentPage={page}
        totalCount={totalCount}
        undoableIds={undoableIds}
        cancellableIds={cancellableIds}
      />
    </div>
  );
}
