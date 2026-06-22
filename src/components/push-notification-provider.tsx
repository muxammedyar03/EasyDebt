"use client";

import { useEffect } from "react";
import { registerServiceWorker } from "@/lib/push/service-worker-registration";

/**
 * Push Notification Provider
 *
 * Registers service worker on mount and handles push notification setup
 */
export function PushNotificationProvider({ children }: { children: React.ReactNode }) {
  useEffect(() => {
    // Register service worker on mount
    if (typeof window !== "undefined" && "serviceWorker" in navigator) {
      registerServiceWorker().catch((error) => {
        console.error("[PushNotificationProvider] Failed to register service worker:", error);
      });
    }
  }, []);

  return <>{children}</>;
}
