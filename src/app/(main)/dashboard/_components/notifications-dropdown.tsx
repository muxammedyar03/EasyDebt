"use client";

import * as React from "react";
import { Bell, Check } from "lucide-react";
import { useRouter } from "next/navigation";
import { NotificationType } from "@prisma/client";

import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Badge } from "@/components/ui/badge";
import { useIsMobile } from "@/hooks/use-mobile";
import type { HeaderNotification } from "@/features/notifications/api/client";
import { invalidateHeaderNotifications } from "@/features/notifications";
import {
  useMarkNotificationRead,
  useUnreadNotificationCount,
  useUnreadNotificationPreview,
} from "@/features/notifications/hooks/use-notification-dropdown";
import { useQueryClient } from "@tanstack/react-query";

interface NotificationsDropdownProps {
  notifications: HeaderNotification[];
  unreadCount?: number;
}

const textColorByType: Record<NotificationType, string> = {
  PAYMENT_REMINDER: "text-orange-600",
  DEBT_LIMIT_EXCEEDED: "text-red-600",
  HOSTING_REMINDER: "text-green-600",
  OVERDUE_PAYMENT: "text-red-600",
  PAYMENT_RECEIVED: "text-green-600",
  DEBT_ADDED: "text-blue-600",
};

export function NotificationsDropdown({ notifications, unreadCount: initialUnreadCount }: NotificationsDropdownProps) {
  const router = useRouter();
  const isMobile = useIsMobile();
  const [isOpen, setIsOpen] = React.useState(false);
  const queryClient = useQueryClient();

  const { data: unreadCount = 0 } = useUnreadNotificationCount(
    initialUnreadCount ?? notifications.filter((n) => !n.is_read).length,
  );

  const { data: items = [] } = useUnreadNotificationPreview({
    enabled: isOpen && !isMobile,
    initialData: notifications,
  });

  // When opening dropdown, refresh badge + list so they stay in sync
  React.useEffect(() => {
    if (isOpen && !isMobile) {
      void invalidateHeaderNotifications(queryClient);
    }
  }, [isOpen, isMobile, queryClient]);

  const markRead = useMarkNotificationRead();

  const badgeCount = Math.min(unreadCount, 99);

  const goToNotifications = () => {
    router.push("/dashboard/notifications");
    setIsOpen(false);
  };

  return (
    <DropdownMenu open={isOpen} onOpenChange={setIsOpen}>
      {!isMobile ? (
        <DropdownMenuTrigger asChild>
          <Button variant="outline" className="relative md:h-12 md:w-12">
            <Bell className="md:!h-5 md:!w-5" />
            {unreadCount > 0 && (
              <Badge
                variant="destructive"
                className="absolute -top-1 -right-1 flex h-5 w-5 items-center justify-center rounded-full p-0 text-xs"
              >
                {badgeCount}
              </Badge>
            )}
          </Button>
        </DropdownMenuTrigger>
      ) : (
        <Button
          variant="outline"
          size="icon"
          className="relative h-10 w-10 md:h-12 md:w-12"
          onClick={() => router.push("/dashboard/notifications")}
        >
          <Bell className="h-5 w-5" />
          {unreadCount > 0 && (
            <Badge
              variant="destructive"
              className="absolute -top-1 -right-1 flex h-5 w-5 items-center justify-center rounded-full p-0 text-xs"
            >
              {badgeCount}
            </Badge>
          )}
        </Button>
      )}

      <DropdownMenuContent align="end" className="w-80">
        <DropdownMenuLabel>Уведомления</DropdownMenuLabel>
        <DropdownMenuSeparator />
        {items.length === 0 ? (
          <div className="flex flex-col gap-2 p-2">
            <div className="text-muted-foreground p-4 text-center text-sm">Нет уведомлений</div>
            <Button variant="outline" size="sm" onClick={goToNotifications}>
              Смотреть все
            </Button>
          </div>
        ) : (
          <>
            {items.slice(0, 5).map((notification, index) => (
              <DropdownMenuItem
                key={notification.id}
                className={`flex cursor-pointer items-center gap-1 border-b p-3 ${index === Math.min(items.length, 5) - 1 ? "border-b-0" : ""} rounded-none`}
                onClick={() => {
                  if (notification.debtor_external_id) {
                    router.push(`/dashboard/default/debitor/${notification.debtor_external_id}`);
                  } else {
                    router.push("/dashboard/notifications");
                  }
                  setIsOpen(false);
                }}
              >
                <div className="flex-1 space-y-1">
                  <span className={`line-clamp-2 font-medium ${textColorByType[notification.type]}`}>
                    {notification.title}
                  </span>
                  <div className="text-muted-foreground line-clamp-2 text-xs">{notification.message}</div>
                </div>
                {!notification.is_read && (
                  <Button
                    variant="outline"
                    className="h-6 w-6 bg-blue-500 text-white hover:bg-blue-600 hover:text-white"
                    disabled={markRead.isPending}
                    onClick={(e) => {
                      e.stopPropagation();
                      markRead.mutate(notification.id);
                    }}
                  >
                    <Check className="h-4 w-4 text-white" />
                  </Button>
                )}
              </DropdownMenuItem>
            ))}
            <DropdownMenuSeparator />
            <DropdownMenuItem className="cursor-pointer justify-center" onClick={goToNotifications}>
              Смотреть все
            </DropdownMenuItem>
          </>
        )}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
