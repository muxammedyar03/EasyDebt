/**
 * Service Worker Registration
 *
 * Handles registration and management of the service worker for push notifications
 */

export async function registerServiceWorker(): Promise<ServiceWorkerRegistration | null> {
  if (typeof window === "undefined" || !("serviceWorker" in navigator)) {
    console.warn("[Push] Service workers are not supported in this browser");
    return null;
  }

  try {
    const registration = await navigator.serviceWorker.register("/sw.js", {
      scope: "/",
    });

    console.log("[Push] Service Worker registered:", registration);

    // Check for updates
    registration.addEventListener("updatefound", () => {
      const newWorker = registration.installing;
      if (newWorker) {
        newWorker.addEventListener("statechange", () => {
          if (newWorker.state === "installed" && navigator.serviceWorker.controller) {
            console.log("[Push] New service worker available");
          }
        });
      }
    });

    return registration;
  } catch (error) {
    console.error("[Push] Service Worker registration failed:", error);
    return null;
  }
}

export async function unregisterServiceWorker(): Promise<boolean> {
  if (typeof window === "undefined" || !("serviceWorker" in navigator)) {
    return false;
  }

  try {
    const registration = await navigator.serviceWorker.ready;
    const unregistered = await registration.unregister();
    console.log("[Push] Service Worker unregistered:", unregistered);
    return unregistered;
  } catch (error) {
    console.error("[Push] Service Worker unregistration failed:", error);
    return false;
  }
}

export async function getServiceWorkerRegistration(): Promise<ServiceWorkerRegistration | null> {
  if (typeof window === "undefined" || !("serviceWorker" in navigator)) {
    return null;
  }

  try {
    return await navigator.serviceWorker.ready;
  } catch (error) {
    console.error("[Push] Failed to get service worker registration:", error);
    return null;
  }
}
