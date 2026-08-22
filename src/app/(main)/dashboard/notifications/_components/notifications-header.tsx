"use client";

import { Button } from "@/components/ui/button";
import { useIsMobile } from "@/hooks/use-mobile";
import { ArrowLeft, Check } from "lucide-react";
import { useRouter } from "next/navigation";
import { useQueryClient } from "@tanstack/react-query";
import { notificationKeys } from "@/features/notifications";

interface NotificationsHeaderProps {
  updateParams: (params: Record<string, string | undefined>) => void;
}

export function NotificationsHeader({ updateParams }: NotificationsHeaderProps) {
  const router = useRouter();
  const isMobile = useIsMobile();
  const queryClient = useQueryClient();

  async function markAllAsRead() {
    await fetch(`/api/notifications`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "mark_all_read" }),
    });
    await queryClient.invalidateQueries({ queryKey: notificationKeys.all });
    updateParams({});
  }

  return (
    <div className="flex items-center justify-between gap-2">
      <div className="flex items-center gap-2">
        <Button variant="ghost" size="icon" onClick={() => router.back()}>
          <ArrowLeft className="!h-5 !w-5" />
        </Button>
        <div>
          <h1 className="text-lg font-bold md:text-2xl">Bildirishnomalar</h1>
          <p className="text-muted-foreground text-xs md:text-sm">Bildirishnomalar sizga yuborilgan barcha xabarlar.</p>
        </div>
      </div>
      <div className="flex items-center gap-2">
        <Button onClick={markAllAsRead} className="text-xs md:text-sm">
          <Check className="!h-5 !w-5" />
          {isMobile ? "" : "Mark all as read"}
        </Button>
      </div>
    </div>
  );
}
