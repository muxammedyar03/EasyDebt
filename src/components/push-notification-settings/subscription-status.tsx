import { CheckCircle2, XCircle, Loader2 } from "lucide-react";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";

interface SubscriptionStatusProps {
  isSubscribed: boolean;
  subscriptionCount: number;
  isLoading: boolean;
  isSubscribing: boolean;
  isSaving: boolean;
  localEnabled: boolean;
  isIOSDevice: boolean;
  isIOSPWA: boolean;
  onToggle: (checked: boolean) => void;
}

export function SubscriptionStatus({
  isSubscribed,
  subscriptionCount,
  isLoading,
  isSubscribing,
  isSaving,
  localEnabled,
  isIOSDevice,
  isIOSPWA,
  onToggle,
}: SubscriptionStatusProps) {
  return (
    <div className="flex items-center justify-between">
      <div className="space-y-0.5">
        <Label htmlFor="push-enabled">Push Notificationlar</Label>
        <p className="text-muted-foreground text-sm">
          {isSubscribed ? `${subscriptionCount} qurilma obuna bo'lgan` : "Push notificationlar o'chirilgan"}
        </p>
      </div>
      <div className="flex items-center gap-2">
        {isLoading || isSubscribing ? (
          <Loader2 className="text-muted-foreground size-5 animate-spin" />
        ) : isSubscribed ? (
          <CheckCircle2 className="size-5 text-green-600" />
        ) : (
          <XCircle className="text-muted-foreground size-5" />
        )}
        <Switch
          id="push-enabled"
          checked={localEnabled && isSubscribed}
          onCheckedChange={onToggle}
          disabled={isLoading || isSaving || isSubscribing || (isIOSDevice && !isIOSPWA)}
        />
      </div>
    </div>
  );
}
