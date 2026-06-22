import { Button } from "@/components/ui/button";
import { NotificationType } from "@prisma/client";
import { Check, EyeOff, Loader2 } from "lucide-react";
import { useState } from "react";
import { NotificationItem } from "./notifications-client";
import { cn } from "@/lib/utils";
import { formatDateUz } from "@/lib/format";
import { t } from "@/lib/i18n";

export function NotificationCardDesktop({
  n,
  updateParams,
}: {
  n: NotificationItem;
  updateParams: (params: Record<string, string | undefined>) => void;
}) {
  const [loadingId, setLoadingId] = useState<number | null>(null);
  const textColorByType: Record<NotificationType, string> = {
    PAYMENT_REMINDER:
      "bg-orange-100 dark:bg-orange-600/30 text-orange-700 dark:text-orange-300 border border-orange-600/30 dark:border-orange-300/30",
    DEBT_LIMIT_EXCEEDED:
      "bg-red-100 dark:bg-red-600/30 text-red-700 dark:text-red-300 border border-red-600/30 dark:border-red-300/30",
    HOSTING_REMINDER:
      "bg-green-100 dark:bg-green-600/30 text-green-700 dark:text-green-300 border border-green-600/30 dark:border-green-300/30",
    OVERDUE_PAYMENT:
      "bg-red-100 dark:bg-red-600/30 text-red-700 dark:text-red-300 border border-red-600/30 dark:border-red-300/30",
    PAYMENT_RECEIVED:
      "bg-green-100 dark:bg-green-600/30 text-green-700 dark:text-green-300 border border-green-600/30 dark:border-green-300/30",
    DEBT_ADDED:
      "bg-blue-100 dark:bg-blue-600/30 text-blue-700 dark:text-blue-300 border border-blue-600/30 dark:border-blue-300/30",
  };

  async function markAsRead(id: number) {
    setLoadingId(id);
    try {
      await fetch(`/api/notifications/${id}`, { method: "PATCH" });
      updateParams({});
    } finally {
      setLoadingId(null);
    }
  }

  if (loadingId === n.id) {
    return (
      <div className="flex items-center justify-center">
        <Loader2 className="h-4 w-4 animate-spin" />
      </div>
    );
  }

  return (
    <div
      key={n.id}
      className={cn(
        "hover:bg-muted/50 grid grid-cols-12 items-center gap-3 rounded rounded-l border-b border-l-6 p-4 transition-colors",
        n.is_read ? "border-l-transparent" : "border-l-blue-500 bg-blue-500/5",
      )}
    >
      {/* Message */}
      <div className="col-span-8 min-w-0 space-y-1">
        <div className={`mt-0.5 text-xs ${n.is_read ? "text-muted-foreground" : ""}`}>
          {formatDateUz(n.created_at, true)}
        </div>
        <div className={`line-clamp-2 text-sm font-medium lg:text-base ${n.is_read ? "text-muted-foreground" : ""}`}>
          {n.message}
        </div>
      </div>

      {/* Title va Sana */}
      <div className="col-span-2 w-32 min-w-0">
        <div
          className={`truncate rounded-full py-1 text-center text-sm font-medium ${n.is_read ? "text-muted-foreground" : ""} ${textColorByType[n.type as NotificationType]}`}
        >
          {n.title}
        </div>
      </div>

      {/* Action Button */}
      <div className="col-span-2 flex justify-end">
        {!n.is_read ? (
          <Button
            variant="outline"
            className="h-12 w-12 bg-blue-500 font-medium text-white hover:bg-blue-600 hover:text-white"
            onClick={() => markAsRead(n.id)}
            disabled={loadingId === n.id}
          >
            <Check className="h-4 w-4" />
          </Button>
        ) : (
          <div className="w-10"></div>
        )}
      </div>
    </div>
  );
}
