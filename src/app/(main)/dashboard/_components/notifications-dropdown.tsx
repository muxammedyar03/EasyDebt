"use client";

import * as React from "react";
import { Bell } from "lucide-react";
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
  async function fetchUnread() {
    try {
      const res = await fetch(`/api/notifications?page=1&pageSize=3&read=false`, { cache: "no-store" });
      if (!res.ok) return;
      const data: { notifications: NotificationsDropdownProps["notifications"]; total: number } = await res.json();
      setItems(data.notifications ?? []);
      setTotalCount(data.total ?? data.notifications.length ?? 0);
    } catch {
      toast("Xatolik", { description: "Bildirishnomalar o'zgartirilmadi" });
    }
  }

  // Seed from SSR props once on mount/update
  React.useEffect(() => {
    setItems(notifications ?? []);
    setTotalCount(notifications?.length ?? 0);
  }, [notifications]);

  // Poll every 5s for fresh data
  React.useEffect(() => {
    const id = setInterval(fetchUnread, 5000);
    return () => clearInterval(id);
  }, []);

  // Also refresh when menu opens
  React.useEffect(() => {
    if (isOpen) fetchUnread();
  }, [isOpen]);

  const labelByType: Record<NotificationType, string> = {
    OVERDUE_PAYMENT: "Muddati o'tgan",
    DEBT_LIMIT_EXCEEDED: "Limitdan oshgan",
    PAYMENT_RECEIVED: "", // filtered elsewhere, but safe default
    DEBT_ADDED: "", // filtered elsewhere, but safe default
    HOSTING_REMINDER: "Hosting eslatma",
  };

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
            {items.slice(0, 3).map((notification) => (
              <DropdownMenuItem
                key={notification.id}
                className="cursor-pointer flex-col items-start gap-1 p-3"
                onClick={() => {
                  if (notification.debtor_id) {
                    router.push(`/dashboard/default/debitor/${notification.debtor_id}`);
                  } else {
                    router.push(`/dashboard/notifications`);
                  }
                  setIsOpen(false);
                }}
              >
                <div className="flex w-full items-center justify-between">
                  <span className="line-clamp-2 font-medium">{notification.title}</span>
                  {labelByType[notification.type] && (
                    <Badge variant="destructive" className="text-xs whitespace-nowrap">
                      {labelByType[notification.type]}
                    </Badge>
                  )}
                </div>
                <div className="text-muted-foreground line-clamp-2 text-xs">{notification.message}</div>
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
