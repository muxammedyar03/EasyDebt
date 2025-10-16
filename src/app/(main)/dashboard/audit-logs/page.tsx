import { prisma } from "@/lib/prisma";
import { AuditLogsTable } from "./_components/audit-logs-table";

export default async function AuditLogsPage() {
  const auditLogs = await prisma.auditLog.findMany({
    orderBy: {
      created_at: "desc",
    },
    take: 100,
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

  const logsWithUsers = auditLogs.map((log) => ({
    ...log,
    user: log.user_id ? userMap.get(log.user_id) || null : null,
  }));

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Audit Log</h1>
        <p className="text-muted-foreground">Barcha harakatlar tarixi</p>
      </div>

      <AuditLogsTable logs={logsWithUsers} />
    </div>
  );
}
