"use client";

import { useState, useEffect, useCallback } from "react";
import { toast } from "sonner";
import type { NotificationType } from "@/lib/notifications";
import { usePushNotification } from "@/hooks/use-push-notification";
import { useNotificationPermission } from "@/hooks/use-notification-permission";
import { isIOS, isIOSStandalone, isNotificationSupported } from "@/utils/device-detection";
import { isPermissionGranted, isPermissionDenied, isPermissionDefault } from "@/utils/notification-permission";

interface UsePushNotificationSettingsReturn {
  // State
  localEnabled: boolean;
  localTypes: NotificationType[];
  isSaving: boolean;
  isSubscribing: boolean;
  isIOSDevice: boolean;
  isIOSPWA: boolean;
  notificationPermission: ReturnType<typeof useNotificationPermission>["permission"];
  isRequestingPermission: boolean;

  // Actions
  handleToggleEnabled: (checked: boolean) => Promise<void>;
  handleToggleType: (type: NotificationType, checked: boolean) => Promise<void>;
  handleRequestPermission: () => Promise<void>;
  handleTestNotification: () => Promise<void>;
}

export function usePushNotificationSettings(): UsePushNotificationSettingsReturn {
  const { isSubscribed, preferences, subscribe, updatePreferences } = usePushNotification();

  const {
    permission: notificationPermission,
    isRequesting: isRequestingPermission,
    requestPermission,
  } = useNotificationPermission();

  const [localEnabled, setLocalEnabled] = useState(preferences.enabled);
  const [localTypes, setLocalTypes] = useState<NotificationType[]>(preferences.notificationTypes);
  const [isSaving, setIsSaving] = useState(false);
  const [isSubscribing, setIsSubscribing] = useState(false);
  const [isIOSDevice, setIsIOSDevice] = useState(false);
  const [isIOSPWA, setIsIOSPWA] = useState(false);

  useEffect(() => {
    setLocalEnabled(preferences.enabled);
    setLocalTypes(preferences.notificationTypes);
    setIsIOSDevice(isIOS());
    setIsIOSPWA(isIOSStandalone());
  }, [preferences]);

  const validateIOSSupport = useCallback((): boolean => {
    if (isIOSDevice && !isIOSPWA) {
      toast.error("Xatolik", {
        description:
          "iOS Safari'da push notificationlar faqat PWA sifatida o'rnatilgan app'da ishlaydi. Iltimos, app'ni Home Screen'ga qo'shing.",
      });
      return false;
    }
    return true;
  }, [isIOSDevice, isIOSPWA]);

  const validateNotificationSupport = useCallback((): boolean => {
    if (!isNotificationSupported()) {
      toast.error("Xatolik", {
        description: "Bildirishnoma API qo'llab-quvvatlanmaydi. Iltimos, boshqa brauzer ishlating.",
      });
      return false;
    }
    return true;
  }, []);

  const ensureNotificationPermission = useCallback(async (): Promise<boolean> => {
    if (!validateNotificationSupport()) {
      return false;
    }

    const currentPermission = notificationPermission;

    if (isPermissionDefault(currentPermission)) {
      const newPermission = await requestPermission();
      if (!isPermissionGranted(newPermission)) {
        toast.error("Xatolik", {
          description: "Bildirishnoma ruxsati berilmadi. Iltimos, ruxsat bering.",
        });
        return false;
      }
      return true;
    }

    if (!isPermissionGranted(currentPermission)) {
      toast.error("Xatolik", {
        description: "Bildirishnoma ruxsati berilmagan. Iltimos, brauzer sozlamalaridan ruxsat bering.",
      });
      return false;
    }

    return true;
  }, [notificationPermission, requestPermission, validateNotificationSupport]);

  const handleToggleEnabled = useCallback(
    async (checked: boolean): Promise<void> => {
      if (checked && !isSubscribed) {
        if (!validateIOSSupport() || !(await ensureNotificationPermission())) {
          return;
        }

        setIsSubscribing(true);
        try {
          const success = await subscribe();
          if (!success) {
            toast.error("Xatolik", {
              description: "Push notificationlar yoqilmadi. Iltimos, qayta urinib ko'ring.",
            });
            return;
          }
        } finally {
          setIsSubscribing(false);
        }
      }

      setLocalEnabled(checked);
      setIsSaving(true);
      try {
        const success = await updatePreferences({
          enabled: checked,
          notificationTypes: localTypes,
        });

        if (success) {
          toast.success("Muvaffaqiyatli", {
            description: checked ? "Push notificationlar yoqildi" : "Push notificationlar o'chirildi",
          });
        } else {
          toast.error("Xatolik", {
            description: "Sozlamalar saqlanmadi",
          });
          setLocalEnabled(!checked);
        }
      } finally {
        setIsSaving(false);
      }
    },
    [isSubscribed, localTypes, subscribe, updatePreferences, validateIOSSupport, ensureNotificationPermission],
  );

  const handleToggleType = useCallback(
    async (type: NotificationType, checked: boolean): Promise<void> => {
      const newTypes = checked ? [...localTypes, type] : localTypes.filter((t) => t !== type);

      setLocalTypes(newTypes);
      setIsSaving(true);
      try {
        const success = await updatePreferences({
          enabled: localEnabled,
          notificationTypes: newTypes,
        });

        if (success) {
          toast.success("Muvaffaqiyatli", {
            description: `Bildirishnoma turi ${checked ? "yoqildi" : "o'chirildi"}`,
          });
        } else {
          toast.error("Xatolik", {
            description: "Sozlamalar saqlanmadi",
          });
          setLocalTypes(localTypes);
        }
      } finally {
        setIsSaving(false);
      }
    },
    [localTypes, localEnabled, updatePreferences],
  );

  const handleRequestPermission = useCallback(async (): Promise<void> => {
    if (!validateIOSSupport() || !validateNotificationSupport()) {
      return;
    }

    try {
      const permission = await requestPermission();

      if (isPermissionGranted(permission)) {
        toast.success("Muvaffaqiyatli", {
          description: "Bildirishnoma ruxsati berildi. Endi push notificationlarni yoqishingiz mumkin.",
        });

        if (!isSubscribed) {
          setIsSubscribing(true);
          try {
            const success = await subscribe();
            if (success) {
              setLocalEnabled(true);
              await updatePreferences({ enabled: true, notificationTypes: localTypes });
            }
          } finally {
            setIsSubscribing(false);
          }
        }
      } else if (isPermissionDenied(permission)) {
        toast.error("Xatolik", {
          description: isIOSPWA
            ? "Bildirishnoma ruxsati rad etilgan. Ruxsat berish uchun: Settings → [App nomi] → Notifications"
            : "Bildirishnoma ruxsati rad etilgan. Iltimos, brauzer sozlamalaridan ruxsat bering.",
          duration: 8000,
        });
      } else {
        toast.error("Xatolik", {
          description: "Bildirishnoma ruxsati berilmadi.",
        });
      }
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : "Noma'lum xatolik";
      console.error("Permission request error:", error);
      toast.error("Xatolik", {
        description: `Ruxsat so'rashda xatolik yuz berdi: ${errorMessage}`,
      });
    }
  }, [
    isSubscribed,
    localTypes,
    subscribe,
    updatePreferences,
    isIOSPWA,
    validateIOSSupport,
    validateNotificationSupport,
    requestPermission,
  ]);

  const handleTestNotification = useCallback(async (): Promise<void> => {
    try {
      if (!validateNotificationSupport()) {
        return;
      }

      let permission = notificationPermission;

      if (isPermissionDefault(permission)) {
        permission = await requestPermission();
      }

      if (!isPermissionGranted(permission)) {
        toast.error("Xatolik", {
          description: isPermissionDenied(permission)
            ? "Bildirishnoma ruxsati rad etilgan. Iltimos, brauzer sozlamalaridan ruxsat bering."
            : "Bildirishnoma ruxsati berilmadi. Iltimos, ruxsat bering.",
        });
        return;
      }

      if (!("serviceWorker" in navigator)) {
        toast.error("Xatolik", {
          description: "Service Worker qo'llab-quvvatlanmaydi",
        });
        return;
      }

      const registration = await navigator.serviceWorker.ready;

      if (!registration) {
        toast.error("Xatolik", {
          description: "Service Worker ro'yxatdan o'tmagan",
        });
        return;
      }

      await registration.showNotification("Test bildirishnoma", {
        body: "Bu test bildirishnomasi. Agar siz buni ko'rsangiz, push notificationlar ishlayapti!",
        icon: "/avatars/user.png",
        badge: "/avatars/user.png",
        tag: "test-notification",
        requireInteraction: false,
      });

      toast.success("Test bildirishnoma yuborildi");
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : "Noma'lum xatolik";
      console.error("Test notification error:", error);
      toast.error("Xatolik", {
        description: `Test bildirishnoma yuborilmadi: ${errorMessage}`,
      });
    }
  }, [notificationPermission, requestPermission, validateNotificationSupport]);

  return {
    // State
    localEnabled,
    localTypes,
    isSaving,
    isSubscribing,
    isIOSDevice,
    isIOSPWA,
    notificationPermission,
    isRequestingPermission,

    // Actions
    handleToggleEnabled,
    handleToggleType,
    handleRequestPermission,
    handleTestNotification,
  };
}
