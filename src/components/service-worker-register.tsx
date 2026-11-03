"use client";

import { useEffect } from "react";

export function ServiceWorkerRegister() {
  useEffect(() => {
    if (typeof window === "undefined" || !("serviceWorker" in navigator)) {
      return;
    }

    navigator.serviceWorker
      .register("/sw.js", { scope: "/" })
      .then((reg) => {
        // Trigger periodic update checks
        reg.update().catch(() => {});
      })
      .catch((err) => {
        console.warn("[EasyDebt SW] Service worker registration failed:", err);
      });
  }, []);

  return null;
}
