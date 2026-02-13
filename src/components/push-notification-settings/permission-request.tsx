import { Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  isPermissionGranted,
  isPermissionDenied,
  type NotificationPermissionStatus,
} from "@/utils/notification-permission";

interface PermissionRequestProps {
  permission: NotificationPermissionStatus;
  isRequesting: boolean;
  isSubscribing: boolean;
  onRequest: () => void;
}

export function PermissionRequest({ permission, isRequesting, isSubscribing, onRequest }: PermissionRequestProps) {
  if (isPermissionGranted(permission)) {
    return null;
  }

  return (
    <div className="space-y-3">
      <p>Push notificationlarni yoqish uchun avval brauzer ruxsatini bering.</p>
      <Button onClick={onRequest} disabled={isRequesting || isSubscribing} className="w-full">
        {isRequesting ? (
          <>
            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            Ruxsat so&apos;ralmoqda...
          </>
        ) : isPermissionDenied(permission) ? (
          "Ruxsatni qayta so'rash"
        ) : (
          "Push Notification Ruxsatini So'rash"
        )}
      </Button>
      {isPermissionDenied(permission) && (
        <p className="mt-2 text-xs">Agar ruxsat rad etilgan bo&apos;lsa, brauzer sozlamalaridan ruxsat bering.</p>
      )}
    </div>
  );
}
