const CACHE_NAME = "alexhurd-site-v1";
const PRECACHE_URLS = [
  "/",
  "/links",
  "/about",
  "/images/logo.avif",
  "/offline.html",
  "/favicon.svg",
];

// External badge/icon hosts to cache
const EXTERNAL_ICON_HOSTS = [
  "https://img.shields.io",
  "https://custom-icon-badges.demolab.com",
];

// Install: cache precached URLs
self.addEventListener("install", (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => cache.addAll(PRECACHE_URLS)),
  );
  self.skipWaiting();
});

// Activate: delete old caches
self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) =>
        Promise.all(
          keys
            .filter((key) => key !== CACHE_NAME)
            .map((key) => caches.delete(key)),
        ),
      ),
  );
  self.clients.claim();
});

// Fetch event
self.addEventListener("fetch", (event) => {
  const req = event.request;

  if (req.method !== "GET") return;

  const url = new URL(req.url);

  // 1. HTML navigations → network-first
  if (req.mode === "navigate") {
    event.respondWith(networkFirst(req));
    return;
  }

  // 2. External static badge/icon images → cache-first with offline fallback
  if (EXTERNAL_ICON_HOSTS.includes(url.origin)) {
    event.respondWith(externalIconCache(req));
    return;
  }

  // 3. Same-origin static assets → cache-first
  if (url.origin === self.location.origin) {
    event.respondWith(cacheFirst(req));
    return;
  }

  // 4. All other requests → let browser handle normally
});

// NETWORK-FIRST for navigations
async function networkFirst(req) {
  const cache = await caches.open(CACHE_NAME);

  try {
    const networkResponse = await fetch(req);

    if (
      networkResponse &&
      (networkResponse.ok || networkResponse.type === "opaque")
    ) {
      try {
        cache.put(req, networkResponse.clone());
      } catch (err) {
        console.warn("Cache put failed (networkFirst)", err);
      }
    }

    return networkResponse;
  } catch (err) {
    const cached = await caches.match(req);
    if (cached) return cached;
    return caches.match("/offline.html");
  }
}

// CACHE-FIRST for same-origin assets
async function cacheFirst(req) {
  const cache = await caches.open(CACHE_NAME);

  const cached = await cache.match(req);
  if (cached) return cached;

  try {
    const networkResponse = await fetch(req);
    if (!networkResponse) return networkResponse;
    if (networkResponse.status >= 400) return networkResponse;

    if (networkResponse.ok || networkResponse.type === "opaque") {
      try {
        cache.put(req, networkResponse.clone());
      } catch (err) {
        console.warn("Cache put failed (cacheFirst)", err);
      }
    }

    return networkResponse;
  } catch (err) {
    const fallback = await caches.match(req);
    if (fallback) return fallback;

    return new Response("Network error", {
      status: 504,
      statusText: "Network error",
      headers: { "Content-Type": "text/plain" },
    });
  }
}

// CACHE-FIRST for external badge icons with offline fallback
async function externalIconCache(req) {
  const cache = await caches.open("external-icons-v1");

  const cached = await cache.match(req);
  if (cached) return cached;

  try {
    const response = await fetch(req);
    if (response && response.ok) {
      cache.put(req, response.clone());
    }
    return response;
  } catch (err) {
    // Offline or network failure → tiny transparent SVG
    return new Response(
      `<svg xmlns="http://www.w3.org/2000/svg" width="1" height="1"/>`,
      { headers: { "Content-Type": "image/svg+xml" } },
    );
  }
}
