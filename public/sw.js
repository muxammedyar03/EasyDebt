/**
 * EasyDebt Service Worker (High-Performance Offline & Push Engine)
 *
 * Handles:
 * - Push notifications & notification click routing
 * - Fast Cache-First caching for static assets, Next.js chunks, fonts, and images (0ms local return)
 * - Instant offline fallback when navigator.onLine === false (zero delay)
 * - Network-First with quick fallback for dynamic pages and RSC payloads
 */

const CACHE_VERSION = "easydebt-v2.2";
const CACHE_STATIC = `easydebt-static-${CACHE_VERSION}`;
const CACHE_PAGES = `easydebt-pages-${CACHE_VERSION}`;

const PRECACHE_ASSETS = [
  "/favicon.ico",
  "/images/edebt2.png",
  "/images/easydebt.png",
  "/dashboard/default",
];

const OFFLINE_PAGE_HTML = `<!DOCTYPE html>
<html lang="uz">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>EasyDebt — Offlayn rejim</title>
  <style>
    body {
      margin: 0; padding: 24px; min-height: 100vh;
      display: flex; flex-direction: column; align-items: center; justify-content: center;
      background: #090d16; color: #f1f5f9; font-family: system-ui, -apple-system, sans-serif; text-align: center;
    }
    .card {
      max-width: 420px; padding: 32px; border-radius: 16px;
      background: rgba(15, 23, 42, 0.85); border: 1px solid rgba(255, 255, 255, 0.1);
      box-shadow: 0 20px 40px -15px rgba(0,0,0,0.6);
    }
    .icon { font-size: 40px; margin-bottom: 12px; }
    h1 { font-size: 20px; margin: 0 0 8px; color: #ffffff; }
    p { font-size: 14px; color: #94a3b8; line-height: 1.5; margin: 0 0 20px; }
    button {
      background: #0284c7; color: white; border: none; border-radius: 8px;
      padding: 10px 20px; font-weight: 600; cursor: pointer; font-size: 14px;
    }
    button:hover { background: #0369a1; }
  </style>
</head>
<body>
  <div class="card">
    <div class="icon">📡</div>
    <h1>Internet aloqasi yo'q</h1>
    <p>EasyDebt offlayn rejimda ishlamoqda. Keshdagi ma'lumotlar saqlangan. Internet ulanganda avtomatik sinxronlanadi.</p>
    <button onclick="window.location.reload()">Qayta urinish</button>
  </div>
</body>
</html>`;

// Install event - Precache key resources
self.addEventListener("install", (event) => {
  self.skipWaiting();
  event.waitUntil(
    caches.open(CACHE_STATIC).then((cache) => {
      return cache.addAll(PRECACHE_ASSETS).catch((err) => {
        console.warn("[SW] Precache asset warning:", err);
      });
    }),
  );
});

// Activate event - Clean old caches and claim clients immediately
self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches.keys().then((keys) => {
      return Promise.all(
        keys.map((key) => {
          if (key !== CACHE_STATIC && key !== CACHE_PAGES) {
            return caches.delete(key);
          }
        }),
      );
    }).then(() => self.clients.claim()),
  );
});

// Quick timeout helper (1200ms)
function fetchWithTimeout(request, timeoutMs = 1200) {
  return new Promise((resolve, reject) => {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => {
      controller.abort();
      reject(new Error("Timeout"));
    }, timeoutMs);

    fetch(request, { signal: controller.signal })
      .then((res) => {
        clearTimeout(timeoutId);
        resolve(res);
      })
      .catch((err) => {
        clearTimeout(timeoutId);
        reject(err);
      });
  });
}

// Fetch event
self.addEventListener("fetch", (event) => {
  const { request } = event;

  // Only handle GET requests
  if (request.method !== "GET") {
    return;
  }

  const url = new URL(request.url);

  // Ignore external origins
  if (url.origin !== self.location.origin) {
    return;
  }

  // 1. Static Assets (Cache-First: return in 0ms without hitting network)
  const isStatic =
    url.pathname.startsWith("/_next/static/") ||
    url.pathname.startsWith("/images/") ||
    url.pathname.startsWith("/avatars/") ||
    url.pathname.endsWith(".png") ||
    url.pathname.endsWith(".jpg") ||
    url.pathname.endsWith(".svg") ||
    url.pathname.endsWith(".ico") ||
    url.pathname.endsWith(".woff2") ||
    url.pathname.endsWith(".css") ||
    url.pathname.endsWith(".js");

  if (isStatic) {
    event.respondWith(
      caches.open(CACHE_STATIC).then(async (cache) => {
        const cached = await cache.match(request);
        if (cached) {
          return cached;
        }
        // If not cached, fetch from network and store in cache
        try {
          const res = await fetch(request);
          if (res && res.status === 200) {
            cache.put(request, res.clone());
          }
          return res;
        } catch {
          return Response.error();
        }
      }),
    );
    return;
  }

  const isOffline = typeof navigator !== "undefined" && !navigator.onLine;

  // 2. Next.js RSC Data Requests (_rsc query param or RSC header)
  const isRsc = url.searchParams.has("_rsc") || request.headers.get("RSC") === "1";
  if (isRsc) {
    event.respondWith(
      (async () => {
        const cache = await caches.open(CACHE_PAGES);

        // If explicitly offline, immediately return cached response (0ms)
        if (isOffline) {
          const cached = await cache.match(request);
          if (cached) return cached;
          return new Response("", { status: 200, headers: { "Content-Type": "text/x-component" } });
        }

        try {
          const networkRes = await fetchWithTimeout(request, 1000);
          if (networkRes && networkRes.status === 200) {
            cache.put(request, networkRes.clone());
          }
          return networkRes;
        } catch {
          const cached = await cache.match(request);
          if (cached) return cached;
          return new Response("", { status: 200, headers: { "Content-Type": "text/x-component" } });
        }
      })(),
    );
    return;
  }

  // 3. Navigation Requests (HTML Pages: /dashboard/default, /dashboard/debtors, etc.)
  if (request.mode === "navigate") {
    event.respondWith(
      (async () => {
        const cache = await caches.open(CACHE_PAGES);

        // If explicitly offline, serve cached page immediately without waiting
        if (isOffline) {
          const cached = await cache.match(request);
          if (cached) return cached;
          const dashboardFallback = await cache.match("/dashboard/default");
          if (dashboardFallback) return dashboardFallback;
          return new Response(OFFLINE_PAGE_HTML, {
            status: 200,
            headers: { "Content-Type": "text/html; charset=utf-8" },
          });
        }

        try {
          const networkRes = await fetchWithTimeout(request, 1200);
          if (networkRes && networkRes.status === 200) {
            cache.put(request, networkRes.clone());
          }
          return networkRes;
        } catch {
          const cached = await cache.match(request);
          if (cached) return cached;
          const dashboardFallback = await cache.match("/dashboard/default");
          if (dashboardFallback) return dashboardFallback;
          return new Response(OFFLINE_PAGE_HTML, {
            status: 200,
            headers: { "Content-Type": "text/html; charset=utf-8" },
          });
        }
      })(),
    );
    return;
  }

  // 4. API GET requests (/api/debtors, /api/health, etc.)
  if (url.pathname.startsWith("/api/")) {
    event.respondWith(
      (async () => {
        const cache = await caches.open(CACHE_PAGES);

        if (isOffline) {
          const cached = await cache.match(request);
          if (cached) return cached;
          return new Response(JSON.stringify({ offline: true }), {
            status: 200,
            headers: { "Content-Type": "application/json" },
          });
        }

        try {
          const networkRes = await fetchWithTimeout(request, 1200);
          if (networkRes && networkRes.status === 200) {
            cache.put(request, networkRes.clone());
          }
          return networkRes;
        } catch {
          const cached = await cache.match(request);
          if (cached) return cached;
          return new Response(JSON.stringify({ offline: true }), {
            status: 200,
            headers: { "Content-Type": "application/json" },
          });
        }
      })(),
    );
  }
});

// Push notification handling
self.addEventListener("push", (event) => {
  let notificationData = {
    title: "EasyDebt",
    body: "Yangi bildirishnoma",
    icon: "/images/edebt2.png",
    badge: "/images/edebt2.png",
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
    } catch {
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
        { action: "open", title: "Ochish" },
        { action: "close", title: "Yopish" },
      ],
    }),
  );
});

// Notification click event
self.addEventListener("notificationclick", (event) => {
  event.notification.close();

  if (event.action === "close") {
    return;
  }

  const notificationData = event.notification.data || {};
  const urlToOpen = notificationData.url || "/dashboard/notifications";

  event.waitUntil(
    self.clients
      .matchAll({ type: "window", includeUncontrolled: true })
      .then((clientList) => {
        for (const client of clientList) {
          if (client.url === urlToOpen && "focus" in client) {
            return client.focus();
          }
        }
        if (self.clients.openWindow) {
          return self.clients.openWindow(urlToOpen);
        }
      }),
  );
});

// Message event
self.addEventListener("message", (event) => {
  if (event.data && event.data.type === "SKIP_WAITING") {
    self.skipWaiting();
  }
});
