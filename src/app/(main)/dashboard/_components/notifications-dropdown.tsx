"use client";

import * as React from "react";
import { Bell, Check } from "lucide-react";
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
import { useRouter } from "next/navigation";
import { NotificationType } from "@prisma/client";
import { useIsMobile } from "@/hooks/use-mobile";
import { toast } from "sonner";

interface NotificationsDropdownProps {
  notifications: {
    id: number;
    created_at: Date;
    user_id: number | null;
    debtor_id: number | null;
    debtor_external_id: string | null;
    type: NotificationType;
    title: string;
    message: string;
    is_read: boolean;
  }[];
}

export function NotificationsDropdown({ notifications }: NotificationsDropdownProps) {
  const router = useRouter();
  const [isOpen, setIsOpen] = React.useState(false);
  const [items, setItems] = React.useState<NotificationsDropdownProps["notifications"]>(notifications ?? []);
  const [totalCount, setTotalCount] = React.useState<number>(notifications?.length ?? 0);
  const isMobile = useIsMobile();
  const fetchUnread = React.useCallback(async () => {
    try {
      const res = await fetch(`/api/notifications?page=1&pageSize=3&read=false`, { cache: "no-store" });
      if (!res.ok) return;
      const data: { notifications: NotificationsDropdownProps["notifications"]; total: number } = await res.json();
      setItems(data.notifications ?? []);
      setTotalCount(data.total ?? data.notifications.length ?? 0);
    } catch {
      toast("Xatolik", { description: "Bildirishnomalar o'zgartirilmadi" });
    }
  }, []);

  // Seed from SSR props once on mount/update
  React.useEffect(() => {
    setItems(notifications ?? []);
    setTotalCount(notifications?.length ?? 0);
  }, [notifications]);

  // Poll every 30s for fresh data (5s juda tez edi)
  React.useEffect(() => {
    const id = setInterval(fetchUnread, 30000);
    return () => clearInterval(id);
  }, [fetchUnread]);

  // Also refresh when menu opens
  React.useEffect(() => {
    if (isOpen) fetchUnread();
  }, [isOpen, fetchUnread]);

  const textColorByType: Record<NotificationType, string> = {
    PAYMENT_REMINDER: "text-orange-600",
    DEBT_LIMIT_EXCEEDED: "text-red-600",
    HOSTING_REMINDER: "text-green-600",
    OVERDUE_PAYMENT: "text-red-600",
    PAYMENT_RECEIVED: "text-green-600",
    DEBT_ADDED: "text-blue-600",
  };

  const markAsRead = React.useCallback(async (id: number) => {
    try {
      await fetch(`/api/notifications/${id}`, { method: "PATCH" });
      setItems(items.map((item) => (item.id === id ? { ...item, is_read: true } : item)));
      toast("Bildirishnoma o'qildi holatiga o'zgartirildi", { duration: 3000 });
      router.refresh();
    } catch {
      toast("Xatolik", { description: "Bildirishnoma o'qildi holatiga o'zgartirilmadi", duration: 3000 });
    }
  }, []);

  return (
    <DropdownMenu open={isOpen} onOpenChange={setIsOpen}>
      {!isMobile ? (
        <DropdownMenuTrigger asChild>
          <Button variant="outline" className="relative md:h-12 md:w-12">
            <Bell className="md:!h-5 md:!w-5" />
            {totalCount > 0 && (
              <Badge
                variant="destructive"
                className="absolute -top-1 -right-1 flex h-5 w-5 items-center justify-center rounded-full p-0 text-xs"
              >
                {Math.min(totalCount, 99)}
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
          {totalCount > 0 && (
            <Badge
              variant="destructive"
              className="absolute -top-1 -right-1 flex h-5 w-5 items-center justify-center rounded-full p-0 text-xs"
            >
              {Math.min(totalCount, 99)}
            </Badge>
          )}
        </Button>
      )}

      <DropdownMenuContent align="end" className="w-80">
        <DropdownMenuLabel>Bildirishnomalar</DropdownMenuLabel>
        <DropdownMenuSeparator />
        {items.length === 0 ? (
          <div className="flex flex-col">
            <div className="text-muted-foreground p-4 text-center text-sm">{"Bildirishnomalar yo'q"}</div>
            <Button
              variant="outline"
              size="sm"
              onClick={() => {
                router.push("/dashboard/notifications");
                setIsOpen(false);
              }}
            >
              {"Barchasini ko'rish"}
            </Button>
          </div>
        ) : (
          <>
            {items.slice(0, 3).map((notification, index) => (
              <DropdownMenuItem
                key={notification.id}
                className={`flex cursor-pointer items-center gap-1 border-b p-3 ${index === items.length - 1 ? "border-b-0" : ""} rounded-none`}
                onClick={() => {
                  if (notification.debtor_external_id) {
                    router.push(`/dashboard/default/debitor/${notification.debtor_external_id}`);
                  } else {
                    router.push(`/dashboard/notifications`);
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
                    onClick={(e) => {
                      e.stopPropagation();
                      markAsRead(notification.id);
                    }}
                  >
                    <Check className="h-4 w-4 text-white" />
                  </Button>
                )}
              </DropdownMenuItem>
            ))}
            <DropdownMenuSeparator />
            <DropdownMenuItem
              className="cursor-pointer justify-center"
              onClick={() => {
                router.push("/dashboard/notifications");
                setIsOpen(false);
              }}
            >
              {"Barchasini ko'rish"}
            </DropdownMenuItem>
          </>
        )}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
