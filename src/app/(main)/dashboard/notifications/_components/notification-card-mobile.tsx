import { Button } from "@/components/ui/button";
import { NotificationType } from "@prisma/client";
import { Check, Loader2 } from "lucide-react";
import { useState } from "react";
import { NotificationItem } from "./notifications-client";
import { cn } from "@/lib/utils";

export function NotificationCardMobile({
  n,
  updateParams,
}: {
  n: NotificationItem;
  updateParams: (params: Record<string, string | undefined>) => void;
}) {
  const [loadingId, setLoadingId] = useState<number | null>(null);
  const textColorByType: Record<NotificationType, string> = {
    PAYMENT_REMINDER: "text-orange-700",
    DEBT_LIMIT_EXCEEDED: "text-red-700",
    HOSTING_REMINDER: "text-green-700",
    OVERDUE_PAYMENT: "text-red-700",
    PAYMENT_RECEIVED: "text-green-700",
    DEBT_ADDED: "text-blue-700",
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
        "hover:bg-muted/50 flex items-center justify-between gap-3 border-b py-2 pl-2 transition-colors",
        n.is_read ? "" : "rounded-l border-l-6 border-l-blue-500 bg-blue-500/5 pr-1",
      )}
    >
      <div className="flex-1 space-y-2">
        {/* Title va Sana */}
        <div className="min-w-0 flex-1 md:col-span-2">
          <div
            className={`truncate text-sm font-medium sm:text-base ${n.is_read ? "text-muted-foreground" : ""} ${textColorByType[n.type as NotificationType]}`}
          >
            {n.title}
          </div>
        </div>
        {/* Message */}
        <div className="min-w-0 flex-1 space-y-2 sm:flex-[2]">
          <div className={`line-clamp-2 text-xs font-medium ${n.is_read ? "text-muted-foreground" : ""}`}>
            {n.message}
          </div>
          <div className={`mt-0.5 text-xs ${n.is_read ? "text-muted-foreground" : ""}`}>{n.created_at_text}</div>
        </div>
      </div>

      {/* Action Button */}
      <div className="flex-shrink-0">
        {!n.is_read ? (
          <Button
            size="sm"
            variant="outline"
            className="h-10 w-10 bg-blue-500 font-medium text-white hover:bg-blue-600 hover:text-white sm:w-auto"
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
