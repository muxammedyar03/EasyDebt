"use client";

import Link from "next/link";
import { useLocale, useTranslations } from "next-intl";

import { Badge } from "@/components/ui/badge";
import type { AuditActorRole, RecentAuditAction } from "@/entities/audit-log";

import { UndoAuditButton } from "../../audit-logs/_components/undo-audit-button";

type AuditActionLabelKey =
  | "actionCancel"
  | "actionUndo"
  | "badgeCompanyCreated"
  | "badgeCompanyDebtAdded"
  | "badgeCompanyDebtDeleted"
  | "badgeCompanyDebtUpdated"
  | "badgeCompanyDeleted"
  | "badgeCompanyPaymentAdded"
  | "badgeCompanyPaymentDeleted"
  | "badgeCompanyPaymentUpdated"
  | "badgeCompanyUpdated"
  | "badgeDebtAdded"
  | "badgeDebtDeleted"
  | "badgeDebtUpdated"
  | "badgeDebtReceiptDeleted"
  | "badgeDebtorCreated"
  | "badgeDebtorDeleted"
  | "badgeDebtorUpdated"
  | "badgeExported"
  | "badgeImported"
  | "badgeLogin"
  | "badgeLogout"
  | "badgePaymentAdded"
  | "badgePaymentDeleted"
  | "badgePaymentUpdated"
  | "badgeReceiptAdded"
  | "badgeReceiptDeleted"
  | "badgeReminder"
  | "badgeSettingsUpdated"
  | "badgeUserCreated"
  | "badgeUserDeleted"
  | "badgeUserUpdated";

type AuditActionLabel = { key: AuditActionLabelKey; color: string };

const ACTION_COLORS = {
  add: "bg-green-600/10 text-green-800 dark:bg-green-500/20 dark:text-green-400",
  create: "bg-blue-600/10 text-blue-800 dark:bg-blue-500/20 dark:text-blue-400",
  update: "bg-blue-600/10 text-blue-800 dark:bg-blue-500/20 dark:text-blue-400",
  remove: "bg-red-600/10 text-red-800 dark:bg-red-500/20 dark:text-red-400",
  warning: "bg-amber-600/10 text-amber-800 dark:bg-amber-500/20 dark:text-amber-400",
  import: "bg-purple-600/10 text-purple-800 dark:bg-purple-500/20 dark:text-purple-400",
  export: "bg-indigo-600/10 text-indigo-800 dark:bg-indigo-500/20 dark:text-indigo-400",
  logout: "bg-slate-600/10 text-slate-800 dark:bg-slate-500/20 dark:text-slate-400",
  login: "bg-indigo-600/10 text-indigo-800 dark:bg-indigo-500/20 dark:text-indigo-400",
} as const;

function coloredActionLabel(key: AuditActionLabelKey, color: string): AuditActionLabel {
  return { key, color };
}

function actionLabel(action: string, entityType: string): AuditActionLabel | null {
  if (action === "CANCEL") return coloredActionLabel("actionCancel", ACTION_COLORS.remove);
  if (action === "UNDO") return coloredActionLabel("actionUndo", ACTION_COLORS.warning);
  if (action === "DEBT_ADDED") return coloredActionLabel("badgeDebtAdded", ACTION_COLORS.add);
  if (action === "PAYMENT_ADDED") return coloredActionLabel("badgePaymentAdded", ACTION_COLORS.add);
  if (action === "DEBT_UPDATED") return coloredActionLabel("badgeDebtUpdated", ACTION_COLORS.update);
  if (action === "PAYMENT_UPDATED") return coloredActionLabel("badgePaymentUpdated", ACTION_COLORS.update);
  if (entityType === "PAYMENT" && action === "UPDATE") {
    return coloredActionLabel("badgePaymentAdded", ACTION_COLORS.create);
  }
  if (action === "IMPORT") return coloredActionLabel("badgeImported", ACTION_COLORS.import);
  if (action === "EXPORT") return coloredActionLabel("badgeExported", ACTION_COLORS.export);

  const labels: Partial<Record<string, Partial<Record<string, AuditActionLabel>>>> = {
    DEBTOR: {
      CREATE: coloredActionLabel("badgeDebtorCreated", ACTION_COLORS.create),
      UPDATE: coloredActionLabel("badgeDebtorUpdated", ACTION_COLORS.update),
      DELETE: coloredActionLabel("badgeDebtorDeleted", ACTION_COLORS.remove),
    },
    DEBT: {
      CREATE: coloredActionLabel("badgeDebtAdded", ACTION_COLORS.add),
      UPDATE: coloredActionLabel("badgeDebtUpdated", ACTION_COLORS.update),
      DELETE: coloredActionLabel("badgeDebtDeleted", ACTION_COLORS.remove),
    },
    PAYMENT: {
      CREATE: coloredActionLabel("badgePaymentAdded", ACTION_COLORS.add),
      UPDATE: coloredActionLabel("badgePaymentUpdated", ACTION_COLORS.update),
      DELETE: coloredActionLabel("badgePaymentDeleted", ACTION_COLORS.remove),
    },
    COMPANY: {
      CREATE: coloredActionLabel("badgeCompanyCreated", ACTION_COLORS.create),
      UPDATE: coloredActionLabel("badgeCompanyUpdated", ACTION_COLORS.update),
      DELETE: coloredActionLabel("badgeCompanyDeleted", ACTION_COLORS.remove),
    },
    COMPANY_DEBT: {
      CREATE: coloredActionLabel("badgeCompanyDebtAdded", ACTION_COLORS.add),
      UPDATE: coloredActionLabel("badgeCompanyDebtUpdated", ACTION_COLORS.update),
      DELETE: coloredActionLabel("badgeCompanyDebtDeleted", ACTION_COLORS.remove),
    },
    COMPANY_PAYMENT: {
      CREATE: coloredActionLabel("badgeCompanyPaymentAdded", ACTION_COLORS.add),
      UPDATE: coloredActionLabel("badgeCompanyPaymentUpdated", ACTION_COLORS.update),
      DELETE: coloredActionLabel("badgeCompanyPaymentDeleted", ACTION_COLORS.remove),
    },
    COMPANY_PAYMENT_RECEIPT: {
      CREATE: coloredActionLabel("badgeReceiptAdded", ACTION_COLORS.add),
      DELETE: coloredActionLabel("badgeReceiptDeleted", ACTION_COLORS.remove),
    },
    COMPANY_DEBT_RECEIPT: {
      DELETE: coloredActionLabel("badgeDebtReceiptDeleted", ACTION_COLORS.remove),
    },
    USER: {
      LOGIN: coloredActionLabel("badgeLogin", ACTION_COLORS.login),
      LOGOUT: coloredActionLabel("badgeLogout", ACTION_COLORS.logout),
      CREATE: coloredActionLabel("badgeUserCreated", ACTION_COLORS.create),
      UPDATE: coloredActionLabel("badgeUserUpdated", ACTION_COLORS.add),
      DELETE: coloredActionLabel("badgeUserDeleted", ACTION_COLORS.remove),
    },
    SETTINGS: {
      UPDATE: coloredActionLabel("badgeSettingsUpdated", ACTION_COLORS.update),
    },
  };

  if (entityType === "PAYMENT_REMINDER") {
    return coloredActionLabel("badgeReminder", ACTION_COLORS.warning);
  }

  return labels[entityType]?.[action] ?? null;
}

function roleLabel(role: AuditActorRole) {
  if (role === "SUPER_ADMIN") return "roleSuperAdmin" as const;
  if (role === "ADMIN") return "roleAdmin" as const;
  return "roleUser" as const;
}

export function RecentActionItem({ action }: { action: RecentAuditAction }) {
  const t = useTranslations("audit");
  const tCommon = useTranslations("common");
  const locale = useLocale();
  const numberLocale = locale === "ru" ? "ru-RU" : "uz-UZ";
  const label = actionLabel(action.action, action.entityType);
  const date = new Intl.DateTimeFormat(numberLocale, {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    hourCycle: "h23",
    timeZone: "Asia/Samarkand",
  }).format(new Date(action.createdAt));
  const money = action.amount === null ? null : `${action.amount.toLocaleString(numberLocale)} ${tCommon("som")}`;
  const subjectName = action.subjectName ?? action.actor?.displayName ?? t("system");

  return (
    <div className="grid grid-cols-[minmax(0,1fr)_minmax(0,1.2fr)] gap-3 border-b py-2 text-sm last:border-0">
      <div className="min-w-0">
        <time className="text-muted-foreground block text-[10px] text-ellipsis" dateTime={action.createdAt}>
          {date}
        </time>
        {action.subjectHref ? (
          <Link
            className="block truncate text-xs font-semibold text-ellipsis text-indigo-800 hover:underline focus-visible:underline dark:text-indigo-400"
            href={action.subjectHref}
            title={subjectName}
          >
            {subjectName}
          </Link>
        ) : (
          <p
            className="truncate text-xs font-semibold text-ellipsis text-indigo-800 dark:text-indigo-400"
            title={subjectName}
          >
            {subjectName}
          </p>
        )}
        {action.actor && (
          <p className="text-muted-foreground text-[10px]" title={t(roleLabel(action.actor.role))}>
            {action.actor.displayName}
          </p>
        )}
      </div>
      <div className="flex min-w-0 flex-col items-end gap-y-1">
        <Badge
          className={`flex max-w-full flex-wrap items-start justify-start gap-x-1 border-0 px-2 py-1 text-[10px] whitespace-normal ${label?.color}`}
        >
          {label ? t(label.key) : `${action.entityType} · ${action.action}`}
          {money && (
            <>
              : <span className="font-semibold">{money}</span>
            </>
          )}
        </Badge>
        {action.canUndo && <UndoAuditButton id={action.id} iconOnly />}
        {action.canCancel && <UndoAuditButton id={action.id} kind="cancel" iconOnly />}
      </div>
    </div>
  );
}
