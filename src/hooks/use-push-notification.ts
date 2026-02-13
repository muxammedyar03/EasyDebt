"use client";

import { useState, useEffect, useCallback } from "react";
import { registerServiceWorker, getServiceWorkerRegistration } from "@/lib/push/service-worker-registration";
import type { NotificationType } from "@/lib/notifications";

interface PushSubscriptionState {
  isSupported: boolean;
  isSubscribed: boolean;
  isLoading: boolean;
  error: string | null;
  subscriptionCount: number;
}

interface PushPreferences {
  enabled: boolean;
  notificationTypes: NotificationType[];
}

export function usePushNotification() {
  const [state, setState] = useState<PushSubscriptionState>({
    isSupported: false,
    isSubscribed: false,
    isLoading: true,
    error: null,
    subscriptionCount: 0,
  });

  const [preferences, setPreferences] = useState<PushPreferences>({
    enabled: false,
    notificationTypes: [],
  });

  const checkSubscriptionStatus = useCallback(async () => {
    try {
      const response = await fetch("/api/push/subscribe");
      if (!response.ok) {
        throw new Error("Failed to check subscription status");
      }

      const data = await response.json();
      setState((prev) => ({
        ...prev,
        isSubscribed: data.subscribed,
        subscriptionCount: data.subscriptionCount || 0,
        isLoading: false,
      }));

      if (data.preferences) {
        setPreferences({
          enabled: data.preferences.enabled,
          notificationTypes: data.preferences.notificationTypes || [],
        });
      }
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : "Failed to check subscription status";
      setState((prev) => ({
        ...prev,
        error: errorMessage,
        isLoading: false,
      }));
    }
  }, []);

  const loadPreferences = useCallback(async () => {
    try {
      const response = await fetch("/api/push/preferences");
      if (!response.ok) {
        throw new Error("Failed to load preferences");
      }

      const data = await response.json();
      setPreferences({
        enabled: data.enabled,
        notificationTypes: data.notification_types || [],
      });
    } catch (error) {
      console.error("Failed to load preferences:", error instanceof Error ? error.message : error);
    }
  }, []);

  // Check if push notifications are supported
  useEffect(() => {
    const isSupported =
      typeof window !== "undefined" &&
      "serviceWorker" in navigator &&
      "PushManager" in window &&
      "Notification" in window;

    setState((prev) => ({ ...prev, isSupported, isLoading: false }));

    if (isSupported) {
      checkSubscriptionStatus();
      loadPreferences();
    }
  }, [checkSubscriptionStatus, loadPreferences]);

  const subscribe = useCallback(async (): Promise<boolean> => {
    if (!state.isSupported) {
      setState((prev) => ({ ...prev, error: "Push notifications are not supported" }));
      return false;
    }

    setState((prev) => ({ ...prev, isLoading: true, error: null }));

    try {
      // Request notification permission
      const permission = await Notification.requestPermission();
      if (permission !== "granted") {
        setState((prev) => ({
          ...prev,
          error: "Notification permission denied",
          isLoading: false,
        }));
        return false;
      }

      // Register service worker
      const registration = await registerServiceWorker();
      if (!registration) {
        throw new Error("Failed to register service worker");
      }

      // Get VAPID public key
      const keyResponse = await fetch("/api/push/public-key");
      if (!keyResponse.ok) {
        throw new Error("Failed to get VAPID public key");
      }
      const { publicKey } = await keyResponse.json();

      // Subscribe to push
      const subscription = await registration.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: urlBase64ToUint8Array(publicKey) as BufferSource,
      });

      // Send subscription to server
      const subscribeResponse = await fetch("/api/push/subscribe", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          endpoint: subscription.endpoint,
          keys: {
            p256dh: arrayBufferToBase64(subscription.getKey("p256dh")!),
            auth: arrayBufferToBase64(subscription.getKey("auth")!),
          },
        }),
      });

      if (!subscribeResponse.ok) {
        throw new Error("Failed to save subscription");
      }

      setState((prev) => ({
        ...prev,
        isSubscribed: true,
        subscriptionCount: prev.subscriptionCount + 1,
        isLoading: false,
        error: null,
      }));

      return true;
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : "Failed to subscribe";
      setState((prev) => ({
        ...prev,
        error: errorMessage,
        isLoading: false,
      }));
      return false;
    }
  }, [state.isSupported]);

  const unsubscribe = useCallback(async (): Promise<boolean> => {
    setState((prev) => ({ ...prev, isLoading: true, error: null }));

    try {
      const registration = await getServiceWorkerRegistration();
      if (!registration) {
        throw new Error("Service worker not registered");
      }

      const subscription = await registration.pushManager.getSubscription();
      if (!subscription) {
        setState((prev) => ({
          ...prev,
          isSubscribed: false,
          isLoading: false,
        }));
        return true;
      }

      // Unsubscribe from push
      await subscription.unsubscribe();

      // Remove from server
      await fetch(`/api/push/subscribe?endpoint=${encodeURIComponent(subscription.endpoint)}`, {
        method: "DELETE",
      });

      setState((prev) => ({
        ...prev,
        isSubscribed: false,
        subscriptionCount: Math.max(0, prev.subscriptionCount - 1),
        isLoading: false,
      }));

      return true;
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : "Failed to unsubscribe";
      setState((prev) => ({
        ...prev,
        error: errorMessage,
        isLoading: false,
      }));
      return false;
    }
  }, []);

  const updatePreferences = useCallback(
    async (newPreferences: Partial<PushPreferences>): Promise<boolean> => {
      try {
        const response = await fetch("/api/push/preferences", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            enabled: newPreferences.enabled ?? preferences.enabled,
            notification_types: newPreferences.notificationTypes ?? preferences.notificationTypes,
          }),
        });

        if (!response.ok) {
          throw new Error("Failed to update preferences");
        }

        const data = await response.json();
        setPreferences({
          enabled: data.enabled,
          notificationTypes: data.notification_types || [],
        });

        return true;
      } catch (error) {
        console.error("Failed to update preferences:", error instanceof Error ? error.message : error);
        return false;
      }
    },
    [preferences],
  );

  return {
    ...state,
    preferences,
    subscribe,
    unsubscribe,
    updatePreferences,
    refresh: checkSubscriptionStatus,
  };
}

// Helper functions
function urlBase64ToUint8Array(base64String: string): Uint8Array {
  const padding = "=".repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/-/g, "+").replace(/_/g, "/");

  const rawData = window.atob(base64);
  const outputArray = new Uint8Array(rawData.length);

  for (let i = 0; i < rawData.length; ++i) {
    outputArray[i] = rawData.charCodeAt(i);
  }
  return outputArray;
}

function arrayBufferToBase64(buffer: ArrayBuffer): string {
  const bytes = new Uint8Array(buffer);
  let binary = "";
  for (let i = 0; i < bytes.byteLength; i++) {
    binary += String.fromCharCode(bytes[i]);
  }
  return window.btoa(binary);
}
