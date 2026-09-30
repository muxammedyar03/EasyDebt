import Link from "next/link";
import { getLocale, getTranslations } from "next-intl/server";
import { prisma } from "@/lib/prisma";
import { undoableAuditIds } from "@/lib/audit-undo";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { UndoAuditButton } from "../../audit-logs/_components/undo-audit-button";
import { cancellableAuditIds } from "@/lib/audit-cancel";

export async function RecentActions({ clientId, canUndo, canCancel, actorRole }: {
  clientId: number; canUndo: boolean; canCancel: boolean; actorRole: string;
}) {
  const [t, locale, logs] = await Promise.all([
    getTranslations("audit"),
    getLocale(),
    prisma.auditLog.findMany({
      where: { client_id: clientId }, orderBy: { created_at: "desc" }, take: 10,
      select: { id: true, user_id: true, action: true, entity_type: true, entity_id: true,
        description: true, created_at: true, old_value: true, new_value: true },
    }),
  ]);
  const [undoIds, cancelIds] = await Promise.all([
    undoableAuditIds(clientId, logs, canUndo, actorRole),
    cancellableAuditIds(clientId, logs, canCancel),
  ]);
  const actors = await prisma.user.findMany({
    where: { client_id: clientId, id: { in: logs.map((log) => log.user_id).filter((id): id is number => id !== null) } },
    select: { id: true, username: true, first_name: true, last_name: true, role: true },
  });
  const users = new Map(actors.map((actor) => [actor.id, actor]));
  const dateFormat = new Intl.DateTimeFormat(locale === "ru" ? "ru-RU" : "uz-UZ", {
    day: "2-digit", month: "2-digit", year: "numeric", hour: "2-digit", minute: "2-digit",
    hourCycle: "h23", timeZone: "Asia/Samarkand",
  });
  return (
    <Card className="sticky top-6 gap-2 overflow-hidden rounded-3xl">
      <CardHeader><CardTitle className="text-xl">{t("recentActions")}</CardTitle></CardHeader>
      <CardContent className="px-4">
        {logs.map((log) => {
          const actor = users.get(log.user_id ?? -1);
          const label = log.action === "CANCEL" ? t("actionCancel") :
            log.action === "UNDO" ? t("actionUndo") :
            log.entity_type === "DEBT" && log.action === "DEBT_ADDED" ? t("badgeDebtAdded") :
            log.entity_type === "PAYMENT" && log.action === "UPDATE" ? t("badgePaymentAdded") :
            log.entity_type === "USER" && log.action === "CREATE" ? t("badgeUserCreated") :
            log.entity_type === "USER" && log.action === "UPDATE" ? t("badgeUserUpdated") :
            log.entity_type === "USER" && log.action === "DELETE" ? t("badgeUserDeleted") :
            log.entity_type === "DEBTOR" && log.action === "CREATE" ? t("badgeDebtorCreated") :
            log.entity_type === "DEBTOR" && log.action === "UPDATE" ? t("badgeDebtorUpdated") :
            log.entity_type === "DEBTOR" && log.action === "DELETE" ? t("badgeDebtorDeleted") :
            `${log.entity_type} · ${log.action}`;
          const value = log.new_value;
          const row = value && typeof value === "object" && !Array.isArray(value) ? value : null;
          const raw = row?.amount;
          const sum = typeof raw === "number" || typeof raw === "string" ? Number(raw) : NaN;
          const money = Number.isFinite(sum) && sum > 0 &&
            (log.entity_type === "DEBT" || log.entity_type === "PAYMENT")
            ? `${sum.toLocaleString(locale === "ru" ? "ru-RU" : "uz-UZ")} so‘m` : null;
          return <div key={log.id} className="grid grid-cols-[minmax(0,1fr)_minmax(0,1.2fr)] gap-3 border-b py-4 text-sm last:border-0">
            <div className="min-w-0">
              <time className="text-muted-foreground block text-xs" dateTime={log.created_at.toISOString()}>
                {dateFormat.format(log.created_at)}
              </time>
              <p className="truncate text-base font-semibold" title={actor?.username}>
                {actor ? [actor.first_name, actor.last_name].filter(Boolean).join(" ") || actor.username : t("system")}
              </p>
              <p className="text-muted-foreground text-xs">{actor?.role === "SUPER_ADMIN" ? t("roleSuperAdmin") :
                actor?.role === "ADMIN" ? t("roleAdmin") : actor ? t("roleUser") : ""}</p>
            </div>
            <div className="flex min-w-0 flex-col items-end gap-2">
              <Badge className="max-w-full border-0 bg-rose-950/80 px-2 py-1 text-xs text-white whitespace-normal dark:bg-rose-900/70">
                {label}{money && <>: <span className="font-semibold">{money}</span></>}
              </Badge>
              {undoIds.includes(log.id) && <UndoAuditButton id={log.id} iconOnly />}
              {cancelIds.includes(log.id) && <UndoAuditButton id={log.id} kind="cancel" iconOnly />}
            </div>
          </div>;
        })}
        <Link className="text-primary inline-block text-sm underline" href="/dashboard/audit-logs">{t("allActions")}</Link>
      </CardContent>
    </Card>
  );
}
