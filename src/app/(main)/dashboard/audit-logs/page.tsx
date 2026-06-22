import { prisma } from "@/lib/prisma";
import { AuditLogsTable } from "./_components/audit-logs-table";
import { AuditLog, Prisma } from "@prisma/client";
import { AuditLogTableProps } from "@/types/types";
import { toast } from "sonner";

export const dynamic = "force-dynamic";
export const revalidate = 0;

export default async function AuditLogsPage({
  searchParams,
}: {
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>;
}) {
  const params = await searchParams;
  const page = Number(params.page) || 1;
  const limit = Number(params.limit) || 50;
  const search = (params.search as string) || "";
  const action = (params.action as string) || "";
  const entityType = (params.entityType as string) || "";
  const dateFrom = (params.dateFrom as string) || "";
  const dateTo = (params.dateTo as string) || "";

  // Build where clause
  const where: Prisma.AuditLogWhereInput = {};

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

  // Get user names
  const userIds = [...new Set(auditLogs.map((log: AuditLog) => log.user_id).filter((id): id is number => id !== null))];
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

  // Get debtor IDs from new_value (for all debtor-related actions)
  const debtorIds = new Set<number>();
  auditLogs.forEach((log) => {
    if (
      (log.action === "DEBT_ADDED" ||
        log.action === "PAYMENT_ADDED" ||
        log.action === "CREATE" ||
        log.action === "UPDATE" ||
        log.action === "DELETE") &&
      log.new_value
    ) {
      try {
        const value = typeof log.new_value === "string" ? JSON.parse(log.new_value) : log.new_value;
        if (value && typeof value === "object" && "debtor_id" in value) {
          debtorIds.add(value.debtor_id as number);
        }
      } catch (e) {
        // Ignore parse errors
        console.error(e);
        toast("Xatolik yuz berdi", { description: String(e) });
      }
    }
  });

  // Fetch debtor names in one query
  const debtors = await prisma.debtor.findMany({
    where: {
      id: {
        in: Array.from(debtorIds),
      },
    },
    select: {
      id: true,
      first_name: true,
      last_name: true,
    },
  });

  const debtorMap = new Map(debtors.map((debtor) => [debtor.id, `${debtor.first_name} ${debtor.last_name}`]));

  const logsWithUsers = auditLogs.map((log) => ({
    ...log,
    user: log.user_id ? userMap.get(log.user_id) || null : null,
    debtorName: (() => {
      if (
        (log.action === "DEBT_ADDED" ||
          log.action === "PAYMENT_ADDED" ||
          log.action === "CREATE" ||
          log.action === "UPDATE" ||
          log.action === "DELETE") &&
        log.new_value
      ) {
        try {
          const value = typeof log.new_value === "string" ? JSON.parse(log.new_value) : log.new_value;
          if (value && typeof value === "object" && "debtor_id" in value) {
            return debtorMap.get(value.debtor_id as number) || null;
          }
        } catch (e) {
          toast("Xatolik yuz berdi", { description: String(e) });
          return null;
        }
      }
      return null;
    })(),
  }));

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Audit Log</h1>
        <p className="text-muted-foreground">Barcha harakatlar tarixi</p>
      </div>

      <AuditLogsTable
        logs={logsWithUsers as AuditLogTableProps[]}
        totalPages={totalPages}
        currentPage={page}
        totalCount={totalCount}
      />
    </div>
  );
}
