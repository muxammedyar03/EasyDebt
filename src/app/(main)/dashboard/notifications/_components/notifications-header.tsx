import { Button } from "@/components/ui/button";
import { useIsMobile } from "@/hooks/use-mobile";
import { t } from "@/lib/i18n";
import { ArrowLeft, Check } from "lucide-react";
import { useRouter } from "next/navigation";

interface NotificationsHeaderProps {
  updateParams: (params: Record<string, string | undefined>) => void;
}

export function NotificationsHeader({ updateParams }: NotificationsHeaderProps) {
  const router = useRouter();
  const isMobile = useIsMobile();

  async function markAllAsRead() {
    await fetch(`/api/notifications`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "mark_all_read" }),
    });
    updateParams({});
  }

  return (
    <div className="flex items-center justify-between gap-2">
      <div className="flex items-center gap-2">
        <Button variant="ghost" size="icon" onClick={() => router.back()}>
          <ArrowLeft className="!h-5 !w-5" />
        </Button>
        <div>
          <h1 className="text-lg font-bold md:text-2xl">{t("notifications.title")}</h1>
          <p className="text-muted-foreground text-xs md:text-sm">{t("notifications.subtitle")}</p>
        </div>
      </div>
      <div className="flex items-center gap-2">
        <Button onClick={markAllAsRead} variant={"outline"} className="!h-12 text-xs md:text-sm">
          <Check className="!h-5 !w-5" />
          {isMobile ? "" : t("notifications.markAllAsRead")}
        </Button>
      </div>
    </div>
  );
}
