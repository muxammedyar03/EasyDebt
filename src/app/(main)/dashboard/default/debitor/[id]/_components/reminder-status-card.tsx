"use client";

import * as React from "react";
import { Bell, Clock, Calendar, AlertCircle } from "lucide-react";
import { format, formatDistanceToNow, isPast, differenceInDays, differenceInHours } from "date-fns";
import { uz } from "date-fns/locale";

import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";
import type { PaymentReminderDomain } from "@/types/domain/payment-reminder.domain";

interface ReminderStatusCardProps {
  activeReminder: PaymentReminderDomain | null;
  isLoading: boolean;
  onOpenDialog: () => void;
}

export function ReminderStatusCard({ activeReminder, isLoading, onOpenDialog }: ReminderStatusCardProps) {
  // Calculate time remaining
  const timeInfo = React.useMemo(() => {
    if (!activeReminder) return null;

    const reminderDate = new Date(activeReminder.reminderAt);
    const now = new Date();
    const isOverdue = isPast(reminderDate);
    const daysDiff = differenceInDays(reminderDate, now);
    const hoursDiff = differenceInHours(reminderDate, now);

    let timeText: string;
    let urgency: "normal" | "warning" | "urgent" | "overdue";

    if (isOverdue) {
      timeText = `${formatDistanceToNow(reminderDate, { locale: uz })} o'tdi`;
      urgency = "overdue";
    } else if (daysDiff === 0) {
      if (hoursDiff <= 1) {
        timeText = "1 soatdan kam qoldi";
        urgency = "urgent";
      } else {
        timeText = `${hoursDiff} soat qoldi`;
        urgency = "warning";
      }
    } else if (daysDiff === 1) {
      timeText = "Ertaga";
      urgency = "warning";
    } else if (daysDiff <= 3) {
      timeText = `${daysDiff} kun qoldi`;
      urgency = "warning";
    } else {
      timeText = `${daysDiff} kun qoldi`;
      urgency = "normal";
    }

    return {
      timeText,
      urgency,
      isOverdue,
      formattedDate: format(reminderDate, "d-MMMM yyyy", { locale: uz }),
      formattedTime: format(reminderDate, "HH:mm"),
    };
  }, [activeReminder]);

  if (isLoading) {
    return (
      <Card className="h-auto border-dashed p-3 sm:h-24">
        {devModeAlert()}
        <CardContent className="flex h-full flex-col justify-between gap-6 p-0 pt-2 sm:flex-row sm:items-center sm:pt-0 lg:p-2">
          <div className="flex items-center gap-4">
            <Skeleton className="h-10 w-10 rounded-full" />
            <div className="flex-1 space-y-2">
              <Skeleton className="h-5 w-32" />
              <Skeleton className="h-3 w-48" />
            </div>
          </div>
          <Skeleton className="h-9 w-full sm:h-12 sm:w-24" />
        </CardContent>
      </Card>
    );
  }

  // No active reminder - show button to create
  if (!activeReminder) {
    const colorClass = "bg-green-500/10 text-green-500 hover:text-green-500 border border-green-500/20";
    return (
      <Card className="border-muted-foreground/30 relative h-auto border-dashed p-3 sm:h-24">
        {devModeAlert()}
        <CardContent className="flex h-full flex-col items-center justify-between gap-6 p-0 sm:flex-row lg:p-2">
          {/* Header */}
          <div className="flex h-full w-full items-center justify-between gap-4 pt-2 sm:pt-0">
            <div className={cn("flex h-10 w-10 items-center justify-center rounded-full", colorClass)}>
              <Bell className="h-5 w-5" />
            </div>
            <div className="flex-1 space-y-1">
              <p className="text-muted-foreground text-sm font-medium">To&apos;lov eslatmasi o&apos;rnatilmagan</p>
              <p className="text-muted-foreground/70 text-xs">
                Qarzdorga to&apos;lov sanasini eslatish uchun eslatma qo&apos;shing
              </p>
            </div>
          </div>
          <Button
            variant="outline"
            size="sm"
            onClick={onOpenDialog}
            className={cn("h-12 w-full cursor-pointer px-4 hover:bg-green-500/20 sm:w-auto", colorClass)}
          >
            <Bell className="mr-2 h-4 w-4" />
            Eslatma qo&apos;shish
          </Button>
        </CardContent>
      </Card>
    );
  }

  // Has active reminder - show status
  const urgencyStyles = {
    normal: "bg-blue-500/10 border-blue-500/30",
    warning: "bg-yellow-500/10 border-yellow-500/30",
    urgent: "bg-orange-500/10 border-orange-500/30",
    overdue: "bg-red-500/10 border-red-500/30",
  };

  const iconStyles = {
    normal: "bg-blue-500/20 text-blue-600",
    warning: "bg-yellow-500/20 text-yellow-600",
    urgent: "bg-orange-500/20 text-orange-600",
    overdue: "bg-red-500/20 text-red-600",
  };

  const badgeStyles = {
    normal: "bg-blue-500/10 text-blue-700 border-blue-500/20",
    warning: "bg-yellow-500/10 text-yellow-700 border-yellow-500/20",
    urgent: "bg-orange-500/10 text-orange-700 border-orange-500/20",
    overdue: "bg-red-500/10 text-red-700 border-red-500/20",
  };

  return (
    <Card className={cn("relative border p-3", urgencyStyles[timeInfo?.urgency ?? "normal"])}>
      {devModeAlert()}
      <CardContent className="flex h-full flex-col items-center justify-between gap-6 p-0 sm:flex-row lg:p-2">
        <div className="flex h-full w-full items-center justify-between gap-4 pt-2 sm:pt-0">
          <div
            className={cn(
              "flex h-10 w-10 items-center justify-center rounded-full",
              iconStyles[timeInfo?.urgency ?? "normal"],
            )}
          >
            {timeInfo?.isOverdue ? <AlertCircle className="h-5 w-5" /> : <Bell className="h-5 w-5" />}
          </div>

          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-2">
              <p className="text-sm font-medium">To&apos;lov eslatmasi</p>
              <Badge variant="outline" className={cn("text-xs", badgeStyles[timeInfo?.urgency ?? "normal"])}>
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
            "h-12 w-full cursor-pointer px-4 hover:bg-green-500/20 sm:w-auto",
            urgencyStyles[timeInfo?.urgency ?? "normal"],
          )}
        >
          Boshqarish
        </Button>
      </CardContent>
    </Card>
  );
}

const devModeAlert = () => {
  return (
    <Card className="absolute top-0 right-0 bottom-0 left-0 flex items-center justify-center rounded-3xl border border-red-500/50 bg-gray-400/10 backdrop-blur-xs">
      <Badge variant="destructive" className="text-base">
        <AlertCircle className="h-4 w-4" />
        Texnik ishlar tufayli bu funksiya mavjud emas!
      </Badge>
    </Card>
  );
};
