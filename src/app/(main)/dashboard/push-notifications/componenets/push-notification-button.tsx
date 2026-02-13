"use client";

import { Bell, BellOff, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { usePushNotification } from "@/hooks/use-push-notification";
import { toast } from "sonner";
import { useRouter } from "next/navigation";

export function PushNotificationButton() {
  const router = useRouter();
  const { isSupported, isSubscribed, isLoading, subscribe, unsubscribe, preferences } = usePushNotification();

  if (!isSupported) {
    return null;
  }

  const handleToggle = async () => {
    if (isSubscribed) {
      const success = await unsubscribe();
      if (success) {
        toast.success("Push notificationlar o'chirildi");
      }
    } else {
      const success = await subscribe();
      if (success) {
        toast.success("Push notificationlar yoqildi");
      }
    }
  };

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" size="icon" disabled={isLoading}>
          {isLoading ? (
            <Loader2 className="size-5 animate-spin" />
          ) : isSubscribed && preferences.enabled ? (
            <Bell className="size-5" />
          ) : (
            <BellOff className="size-5" />
          )}
          <span className="sr-only">Push notificationlar</span>
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-56">
        <DropdownMenuLabel>Push Notificationlar</DropdownMenuLabel>
        <DropdownMenuSeparator />
        <DropdownMenuItem onClick={handleToggle} disabled={isLoading}>
          {isSubscribed ? "O'chirish" : "Yoqish"}
        </DropdownMenuItem>
        <DropdownMenuItem onClick={() => router.push("/dashboard/settings/push-notifications")}>
          Sozlamalar
        </DropdownMenuItem>
        {isSubscribed && (
          <>
            <DropdownMenuSeparator />
            <div className="text-muted-foreground px-2 py-1.5 text-xs">
              {preferences.enabled ? `${preferences.notificationTypes.length} tur yoqilgan` : "O'chirilgan"}
            </div>
          </>
        )}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
