"use client";

import { Separator } from "@/components/ui/separator";
import { usePushNotification } from "@/hooks/use-push-notification";
import { usePushNotificationSettings } from "@/hooks/use-push-notification-settings";
import { SubscriptionStatus } from "./push-notification-settings/subscription-status";
import { NotificationTypes } from "./push-notification-settings/notification-types";
import { TestNotification } from "./push-notification-settings/test-notification";
import { PermissionRequest } from "./push-notification-settings/permission-request";
import { IOSWarning } from "./push-notification-settings/ios-warning";
import { NOTIFICATION_TYPE_LABELS } from "./push-notification-settings/constants";

export function PushNotificationSettings() {
  const { isSupported, isSubscribed, isLoading, error, subscriptionCount } = usePushNotification();

  const {
    localEnabled,
    localTypes,
    isSaving,
    isSubscribing,
    isIOSDevice,
    isIOSPWA,
    notificationPermission,
    isRequestingPermission,
    handleToggleEnabled,
    handleToggleType,
    handleRequestPermission,
    handleTestNotification,
  } = usePushNotificationSettings();

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-semibold tracking-tight">Push Notification Sozlamalari</h2>
        <p className="text-muted-foreground mt-1 text-sm">
          Brauzer yopilganda ham bildirishnomalar olish uchun sozlamalar
        </p>
      </div>

      <SubscriptionStatus
        isSubscribed={isSubscribed}
        subscriptionCount={subscriptionCount}
        isLoading={isLoading}
        isSubscribing={isSubscribing}
        isSaving={isSaving}
        localEnabled={localEnabled}
        isIOSDevice={isIOSDevice}
        isIOSPWA={isIOSPWA}
        onToggle={handleToggleEnabled}
      />

      {error && <div className="bg-destructive/10 text-destructive rounded-md p-3 text-sm">{error}</div>}

      {isSubscribed && !isLoading && isSupported && (
        <>
          <Separator />

          <NotificationTypes
            types={localTypes}
            enabled={localEnabled}
            isSaving={isSaving}
            typeLabels={NOTIFICATION_TYPE_LABELS}
            onToggle={handleToggleType}
          />

          <Separator />

          <TestNotification enabled={localEnabled} onTest={handleTestNotification} />
        </>
      )}

      {!isLoading && !isSubscribed && !localEnabled && (
        <div className="rounded-md bg-yellow-500/10 p-3 text-sm text-yellow-600 dark:text-yellow-500">
          {isIOSDevice && !isIOSPWA ? (
            <IOSWarning isIOSDevice={isIOSDevice} isIOSPWA={isIOSPWA} />
          ) : (
            <PermissionRequest
              permission={notificationPermission}
              isRequesting={isRequestingPermission}
              isSubscribing={isSubscribing}
              onRequest={handleRequestPermission}
            />
          )}
        </div>
      )}
    </div>
  );
}
