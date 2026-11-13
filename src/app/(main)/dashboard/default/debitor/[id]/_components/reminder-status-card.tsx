"use client";

import * as React from "react";
import { Bell, Clock, Calendar, AlertCircle } from "lucide-react";
import { format, formatDistanceToNow, isPast, differenceInDays, differenceInHours } from "date-fns";
import { ru, uz } from "date-fns/locale";
import { useLocale, useTranslations } from "next-intl";

import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";
import type { PaymentReminderDomain } from "@/types/domain/payment-reminder.domain";
import { formatDateUz } from "@/lib/format";

interface ReminderStatusCardProps {
  activeReminder: PaymentReminderDomain | null;
  isLoading: boolean;
  onOpenDialog: () => void;
}

export function ReminderStatusCard({ activeReminder, isLoading, onOpenDialog }: ReminderStatusCardProps) {
  const t = useTranslations("debtor");
  const locale = useLocale();
  const dateLocale = locale === "ru" ? ru : uz;
  const [currentTime, setCurrentTime] = React.useState(new Date());

  React.useEffect(() => {
    if (!activeReminder) return;

    const reminderDate = new Date(activeReminder.reminderAt);
    const hoursUntilReminder = differenceInHours(reminderDate, currentTime);
    const intervalMs = hoursUntilReminder <= 24 ? 30000 : 60000;

    const interval = setInterval(() => {
      setCurrentTime(new Date());
    }, intervalMs);

    return () => clearInterval(interval);
  }, [activeReminder, currentTime]);

  const timeInfo = React.useMemo(() => {
    if (!activeReminder) return null;

    const reminderDate = new Date(activeReminder.reminderAt);
    const now = currentTime;
    const isOverdue = isPast(reminderDate);
    const daysDiff = differenceInDays(reminderDate, now);
    const hoursDiff = differenceInHours(reminderDate, now);

    let timeText: string;
    let urgency: "normal" | "warning" | "urgent" | "overdue";

    if (isOverdue) {
      timeText = t("ago", {
        time: formatDistanceToNow(reminderDate, { locale: dateLocale }),
      });
      urgency = "overdue";
    } else if (daysDiff === 0) {
      if (hoursDiff <= 1) {
        timeText = t("lessThanOneHour");
        urgency = "urgent";
      } else {
        timeText = t("hoursLeft", { count: hoursDiff });
        urgency = "warning";
      }
    } else if (daysDiff === 1) {
      timeText = t("tomorrow");
      urgency = "warning";
    } else if (daysDiff <= 3) {
      timeText = t("daysLeft", { count: daysDiff });
      urgency = "warning";
    } else {
      timeText = t("daysLeft", { count: daysDiff });
      urgency = "normal";
    }

    return {
      timeText,
      urgency,
      isOverdue,
      formattedDate: formatDateUz(reminderDate),
      formattedTime: formatDateUz(reminderDate, true),
    };
  }, [activeReminder, currentTime, dateLocale, t]);

  if (isLoading) {
    return (
      <Card className="h-auto border-dashed p-3 sm:h-24">
        <CardContent className="flex h-full flex-col justify-between gap-6 p-0 pt-2 sm:flex-row sm:items-center sm:pt-0 lg:p-2">
          <div className="flex items-center gap-4">
            <Skeleton className="h-10 w-10 rounded-full" />
            <div className="flex-1 space-y-2">
              <Skeleton className="h-5 w-32" />
              <Skeleton className="h-3 w-48" />
            </div>
          </div>
          <Skeleton className="h-9 w-full sm:h-9 sm:w-24" />
        </CardContent>
      </Card>
    );
  }

  if (!activeReminder) {
    const colorClass =
      "bg-green-500/20 text-green-700 dark:text-green-500 hover:text-green-700 dark:hover:text-green-500 border border-green-500/20";
    return (
      <Card className="border-muted-foreground/30 relative h-auto border-dashed p-3 sm:h-24">
        <CardContent className="flex h-full flex-col items-center justify-between gap-6 p-0 sm:flex-row lg:p-2">
          <div className="flex h-full w-full items-center justify-between gap-4 pt-2 sm:pt-0">
            <div className={cn("flex h-10 w-10 items-center justify-center rounded-full", colorClass)}>
              <Bell className="h-5 w-5" />
            </div>
            <div className="flex-1 space-y-1">
              <p className="text-muted-foreground text-sm font-medium">{t("reminderNotSet")}</p>
              <p className="text-muted-foreground/70 text-xs">{t("reminderNotSetHint")}</p>
            </div>
          </div>
          <Button
            variant="outline"
            size="sm"
            onClick={onOpenDialog}
            className={cn("h-9 w-full cursor-pointer px-4 hover:bg-green-500/20 sm:w-auto", colorClass)}
          >
            <Bell className="mr-2 h-4 w-4" />
            {t("reminderAdd")}
          </Button>
        </CardContent>
      </Card>
    );
  }

  const isNotified = activeReminder.status === "NOTIFIED";

  const urgencyStyles = {
    normal:
      "bg-blue-600/10 hover:bg-blue-600/10 text-blue-700 hover:text-blue-700 dark:text-blue-500 border border-blue-500/15",
    warning: "bg-yellow-600/10 hover:bg-yellow-600/10 text-yellow-700 hover:text-yellow-700 dark:text-yellow-500",
    urgent:
      "bg-orange-600/10 hover:bg-orange-600/10 text-orange-700 hover:text-orange-700 dark:text-orange-500 border border-orange-600/15",
    overdue:
      "bg-red-600/10 hover:bg-red-600/10 text-red-700 hover:text-red-700 dark:text-red-500 border border-red-600/15",
    notified:
      "bg-purple-600/10 hover:bg-purple-600/10 dark:bg-purple-600/15 text-purple-700 hover:text-purple-700 dark:text-purple-500 border border-purple-600/15",
  };

  const iconStyles = {
    normal: "bg-blue-600/15 dark:bg-blue-600/20 text-blue-700 dark:text-blue-500",
    warning: "bg-yellow-500/20 text-yellow-600",
    urgent: "bg-orange-600/15 text-orange-700 dark:text-orange-500",
    overdue: "bg-red-600/10 dark:bg-red-600/15 text-red-700 dark:text-red-500",
    notified: "bg-purple-500/15 text-purple-700 dark:text-purple-500",
  };

  const badgeStyles = {
    normal: "bg-blue-600/15 text-blue-700 dark:text-blue-500",
    warning: "bg-yellow-600/15 text-yellow-700 dark:text-yellow-500",
    urgent: "bg-orange-600/15 text-orange-700 dark:text-orange-500",
    overdue: "bg-red-600/15 text-red-700 dark:text-red-500",
    notified: "bg-purple-600/15 text-purple-700 dark:text-purple-500",
  };

  const currentStyle = isNotified ? "notified" : (timeInfo?.urgency ?? "normal");

  return (
    <Card className={cn("relative p-3", urgencyStyles[currentStyle])}>
      <CardContent className="flex h-full flex-col items-center justify-between gap-6 p-0 sm:flex-row lg:p-2">
        <div className="flex h-full w-full items-center justify-between gap-4 pt-2 sm:pt-0">
          <div className={cn("flex h-10 w-10 items-center justify-center rounded-full", iconStyles[currentStyle])}>
            {isNotified ? (
              <Bell className="h-5 w-5" />
            ) : timeInfo?.isOverdue ? (
              <AlertCircle className="h-5 w-5" />
            ) : (
              <Bell className="h-5 w-5" />
            )}
          </div>

          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-2">
              <p className="text-sm font-medium">{isNotified ? t("reminderSent") : t("reminderTitle")}</p>
              <Badge variant="outline" className={cn("text-xs", badgeStyles[currentStyle])}>
                {timeInfo?.timeText}
              </Badge>
            </div>
            <div className="text-muted-foreground mt-1 flex items-center gap-3 text-xs">
              <span className="flex items-center gap-1">
                <Calendar className="h-3 w-3" />
                {timeInfo?.formattedDate}
              </span>
              <span className="flex items-center gap-1">
                <Clock className="h-3 w-3" />
                {timeInfo?.formattedTime}
              </span>
              {isNotified && activeReminder.notifiedAt && (
                <span className="text-purple-600">
                  •{" "}
                  {t("notifiedAt", {
                    time: format(new Date(activeReminder.notifiedAt), "HH:mm"),
                  })}
                </span>
              )}
            </div>
            {activeReminder.note && (
              <p className="text-muted-foreground mt-1 truncate text-xs">{activeReminder.note}</p>
            )}
          </div>
        </div>

        <Button
          variant="outline"
          size="sm"
          onClick={onOpenDialog}
          className={cn(
            "h-9 w-full cursor-pointer px-4 sm:w-auto",
            isNotified
              ? "bg-purple-600/15 text-purple-700 hover:bg-purple-600/15 hover:text-purple-700 dark:text-purple-500"
              : urgencyStyles[currentStyle],
          )}
        >
          {isNotified ? t("reminderComplete") : t("reminderManage")}
        </Button>
      </CardContent>
    </Card>
  );
}
