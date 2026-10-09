"use client";

import Link from "next/link";
import { useTranslations } from "next-intl";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useRecentAuditActions } from "@/features/audit-log";

import { RecentActionItem } from "./recent-action-item";
import { ArrowRight } from "lucide-react";

export function RecentActions() {
  const t = useTranslations("audit");
  const tCommon = useTranslations("common");
  const { data, isPending, isError } = useRecentAuditActions();
  const actions = data?.actions ?? [];

  return (
    <Card className="sticky top-6 !gap-0 !space-y-0 overflow-hidden rounded-3xl p-2">
      <CardHeader className="m-0 p-1">
        <CardTitle className="text-sm">{t("recentActions")}</CardTitle>
      </CardHeader>
      <CardContent className="m-0 px-2">
        {isPending && <p className="text-muted-foreground py-4 text-sm">{tCommon("loading")}</p>}
        {isError && (
          <p className="text-destructive py-4 text-sm" role="alert">
            {t("errorOccurred")}
          </p>
        )}
        {!isPending && !isError && actions.length === 0 && (
          <p className="text-muted-foreground py-4 text-sm">{tCommon("noData")}</p>
        )}
        {actions.map((action) => (
          <RecentActionItem key={action.id} action={action} />
        ))}
        <Link
          className="text-primary hover:bg-accent mt-2 flex w-36 items-center justify-center gap-x-1 rounded-md p-1 text-sm hover:underline"
          href="/dashboard/audit-logs"
        >
          {t("allActions")}
          <ArrowRight className="size-4" />
        </Link>
      </CardContent>
    </Card>
  );
}
