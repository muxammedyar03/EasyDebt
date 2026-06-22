import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";

interface TestNotificationProps {
  enabled: boolean;
  onTest: () => void;
}

export function TestNotification({ enabled, onTest }: TestNotificationProps) {
  return (
    <div className="flex items-center justify-between">
      <div className="space-y-0.5">
        <Label>Test bildirishnoma</Label>
        <p className="text-muted-foreground text-sm">Push notificationlar ishlayotganini tekshirish</p>
      </div>
      <Button variant="outline" size="sm" onClick={onTest} disabled={!enabled}>
        Test yuborish
      </Button>
    </div>
  );
}
