/**
 * Service Worker for Push Notifications
 *
 * This service worker handles:
 * - Push notifications
 * - Notification clicks
 * - Background sync
 */

const CACHE_NAME = "easy-debt-v1";

// Install event - cache static assets
self.addEventListener("install", (_event) => {
  console.log("[Service Worker] Installing...");
  self.skipWaiting();
});

// Activate event - clean up old caches
self.addEventListener("activate", (event) => {
  console.log("[Service Worker] Activating...");
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(cacheNames.filter((name) => name !== CACHE_NAME).map((name) => caches.delete(name)));
    }),
  );
  return self.clients.claim();
});

// Push event - handle incoming push notifications
self.addEventListener("push", (event) => {
  console.log("[Service Worker] Push received:", event);

  let notificationData = {
    title: "Easy Debt",
    body: "Yangi bildirishnoma",
    icon: "/avatars/user.png",
    badge: "/avatars/user.png",
    tag: "easy-debt-notification",
    data: {},
  };

  if (event.data) {
    try {
      const data = event.data.json();
      notificationData = {
        title: data.title || notificationData.title,
        body: data.message || data.body || notificationData.body,
        icon: data.icon || notificationData.icon,
        badge: data.badge || notificationData.badge,
        tag: data.tag || `notification-${data.id || Date.now()}`,
        data: {
          url: data.url || "/dashboard/notifications",
          notificationId: data.notificationId,
          type: data.type,
        },
        requireInteraction: data.requireInteraction || false,
      };
    } catch (e) {
      console.error("[Service Worker] Failed to parse push data:", e);
      notificationData.body = event.data.text() || notificationData.body;
    }
  }

  event.waitUntil(
    self.registration.showNotification(notificationData.title, {
      body: notificationData.body,
      icon: notificationData.icon,
      badge: notificationData.badge,
      tag: notificationData.tag,
      data: notificationData.data,
      requireInteraction: notificationData.requireInteraction,
      actions: [
        {
          action: "open",
          title: "Ochish",
        },
        {
          action: "close",
          title: "Yopish",
        },
      ],
    }),
  );
});

// Notification click event
self.addEventListener("notificationclick", (event) => {
  console.log("[Service Worker] Notification clicked:", event);

  event.notification.close();

  const action = event.action;
  const notificationData = event.notification.data || {};

  if (action === "close") {
    return;
  }

  // Default action or "open" action
  const urlToOpen = notificationData.url || "/dashboard/notifications";

  event.waitUntil(
    self.clients
      .matchAll({
        type: "window",
        includeUncontrolled: true,
      })
      .then((clientList) => {
        // Check if there's already a window/tab open with the target URL
        for (const client of clientList) {
          if (client.url === urlToOpen && "focus" in client) {
            return client.focus();
          }
        }
        // If no window is open, open a new one
        if (self.clients.openWindow) {
          return self.clients.openWindow(urlToOpen);
        }
      }),
  );
});

// Message event - handle messages from the main thread
self.addEventListener("message", (event) => {
  console.log("[Service Worker] Message received:", event.data);

  if (event.data && event.data.type === "SKIP_WAITING") {
    self.skipWaiting();
  }
});
