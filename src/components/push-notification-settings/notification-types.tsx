import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import type { NotificationType } from "@/lib/notifications";

interface NotificationTypesProps {
  types: NotificationType[];
  enabled: boolean;
  isSaving: boolean;
  typeLabels: Record<NotificationType, string>;
  onToggle: (type: NotificationType, checked: boolean) => void;
}

export function NotificationTypes({ types, enabled, isSaving, typeLabels, onToggle }: NotificationTypesProps) {
  return (
    <div className="space-y-4">
      <div>
        <Label>Bildirishnoma turlari</Label>
        <p className="text-muted-foreground mt-1 text-sm">Qaysi bildirishnomalarni olishni tanlang</p>
      </div>
      <div className="space-y-3">
        {(Object.keys(typeLabels) as NotificationType[]).map((type) => (
          <div key={type} className="flex items-center justify-between">
            <Label htmlFor={`type-${type}`} className="cursor-pointer font-normal">
              {typeLabels[type]}
            </Label>
            <Checkbox
              id={`type-${type}`}
              checked={types.includes(type)}
              onCheckedChange={(checked) => onToggle(type, checked as boolean)}
              disabled={!enabled || isSaving}
            />
          </div>
        ))}
      </div>
    </div>
  );
}
