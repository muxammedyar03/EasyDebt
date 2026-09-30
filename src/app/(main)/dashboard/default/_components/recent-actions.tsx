import Link from "next/link";
import { getTranslations } from "next-intl/server";
import { prisma } from "@/lib/prisma";
import { undoableAuditIds } from "@/lib/audit-undo";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { UndoAuditButton } from "../../audit-logs/_components/undo-audit-button";

export async function RecentActions({ clientId, canUndo }: { clientId: number; canUndo: boolean }) {
  const [t, logs] = await Promise.all([
    getTranslations("audit"),
    prisma.auditLog.findMany({
      where: { client_id: clientId }, orderBy: { created_at: "desc" }, take: 10,
      select: { id: true, user_id: true, action: true, entity_type: true, entity_id: true,
        description: true, created_at: true, old_value: true, new_value: true },
    }),
  ]);
  const ids = await undoableAuditIds(clientId, logs, canUndo);
  const actors = await prisma.user.findMany({
    where: { client_id: clientId, id: { in: logs.map((log) => log.user_id).filter((id): id is number => id !== null) } },
    select: { id: true, username: true, first_name: true, last_name: true },
  });
  const names = new Map(actors.map((actor) => [actor.id,
    [actor.first_name, actor.last_name].filter(Boolean).join(" ") || actor.username]));
  return (
    <Card className="sticky top-6">
      <CardHeader><CardTitle>{t("recentActions")}</CardTitle></CardHeader>
      <CardContent className="space-y-3">
        {logs.map((log) => (
          <div key={log.id} className="border-b pb-3 text-sm last:border-0">
            <div className="flex items-start justify-between gap-2">
              <span className="font-medium">{names.get(log.user_id ?? -1) || "System"}</span>
              <time className="text-muted-foreground shrink-0 text-xs" dateTime={log.created_at.toISOString()}>
                {new Intl.DateTimeFormat("uz-UZ", { dateStyle: "short", timeStyle: "short", timeZone: "Asia/Samarkand" }).format(log.created_at)}
              </time>
            </div>
            <p className="text-muted-foreground mt-1 break-words">{log.description || `${log.action} · ${log.entity_type} #${log.entity_id ?? ""}`}</p>
            {ids.includes(log.id) && <div className="mt-2"><UndoAuditButton id={log.id} /></div>}
          </div>
        ))}
        <Link className="text-primary inline-block text-sm underline" href="/dashboard/audit-logs">{t("allActions")}</Link>
      </CardContent>
    </Card>
  );
}
