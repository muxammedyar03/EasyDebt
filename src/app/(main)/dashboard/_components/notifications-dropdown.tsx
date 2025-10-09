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

interface Notification {
  id: number;
  debtor_id: number;
  debtor_name: string;
  total_debt: number;
  debt_limit: number;
}

interface NotificationsDropdownProps {
  notifications: Notification[];
}

export function NotificationsDropdown({ notifications }: NotificationsDropdownProps) {
  const router = useRouter();
  const [isOpen, setIsOpen] = React.useState(false);

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat("uz-UZ").format(amount) + " so'm";
  };

  return (
    <DropdownMenu open={isOpen} onOpenChange={setIsOpen}>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" size="icon" className="relative">
          <Bell className="h-5 w-5" />
          {notifications.length > 0 && (
            <Badge
              variant="destructive"
              className="absolute -top-1 -right-1 flex h-5 w-5 items-center justify-center rounded-full p-0 text-xs"
            >
              {notifications.length}
            </Badge>
          )}
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-80">
        <DropdownMenuLabel>Bildirishnomalar</DropdownMenuLabel>
        <DropdownMenuSeparator />
        {notifications.length === 0 ? (
          <div className="text-muted-foreground p-4 text-center text-sm">{"Bildirishnomalar yo'q"}</div>
        ) : (
          <>
            {notifications.map((notification) => (
              <DropdownMenuItem
                key={notification.id}
                className="cursor-pointer flex-col items-start gap-1 p-3"
                onClick={() => {
                  router.push(`/dashboard/default/debitor/${notification.debtor_id}`);
                  setIsOpen(false);
                }}
              >
                <div className="flex w-full items-center justify-between">
                  <span className="font-medium">{notification.debtor_name}</span>
                  <Badge variant="destructive" className="text-xs">
                    Limitdan oshgan
                  </Badge>
                </div>
                <div className="text-muted-foreground text-xs">Qarz: {formatCurrency(notification.total_debt)}</div>
                <div className="text-muted-foreground text-xs">Limit: {formatCurrency(notification.debt_limit)}</div>
              </DropdownMenuItem>
            ))}
            <DropdownMenuSeparator />
            <DropdownMenuItem
              className="cursor-pointer justify-center"
              onClick={() => {
                router.push("/dashboard/debtors?status=limitdan_oshgan");
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
