const cache_name = "alexhurd-site-v1";

const precache_urls = [
  "/",
  "/links",
  "/about",
  "/images/logo.avif",
  "/offline.html",
  "/favicon.svg",
];

self.addEventListener("install", (event) => {
  event.waitUntil(
    caches.open(cache_name).then((cache) => {
      return cache.addAll(precache_urls);
    }),
  );
  self.skipWaiting();
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) =>
        Promise.all(
          keys
            .filter((key) => key !== cache_name)
            .map((key) => caches.delete(key)),
        ),
      ),
  );
  self.clients.claim();
});

self.addEventListener("fetch", (event) => {
  const req = event.request;

  if (req.method !== "GET") {
    return;
  }

  // Navigation requests (HTML)
  if (req.mode === "navigate") {
    event.respondWith(networkFirst(req));
    return;
  }

  // Everything else -> cache-first
  event.respondWith(cacheFirst(req));
});

async function networkFirst(req) {
  const cache = await caches.open(cache_name);

  try {
    const networkResponse = await fetch(req);

    // If the response is valid, put a clone in the cache.
    // Accept networkResponse.ok (2xx) OR opaque (type === 'opaque') responses.
    if (
      networkResponse &&
      (networkResponse.ok || networkResponse.type === "opaque")
    ) {
      try {
        cache.put(req, networkResponse.clone());
      } catch (err) {
        // put can fail for opaque or other reasons in some browsers — ignore
        console.warn("Cache put failed (networkFirst)", err);
      }
    }

    return networkResponse;
  } catch (err) {
    // Network failed — return cached navigation or offline.html
    const cached = await caches.match(req);
    if (cached) return cached;
    return caches.match("/offline.html");
  }
}

async function cacheFirst(req) {
  const cache = await caches.open(cache_name);

  // Try cache
  const cached = await caches.match(req);
  if (cached) return cached;

  // Not in cache — attempt network fetch
  try {
    const networkResponse = await fetch(req);

    // Don't cache if response is 404/500
    if (!networkResponse) return networkResponse;
    if (networkResponse.status >= 400) return networkResponse;

    // Cache successful responses. We allow caching of "opaque" responses,
    // but be aware of CORS implications for caching cross-origin resources.
    if (networkResponse.ok || networkResponse.type === "opaque") {
      try {
        cache.put(req, networkResponse.clone());
      } catch (err) {
        // best-effort caching; swallow errors
        console.warn("Cache put failed (cacheFirst)", err);
      }
    }

    return networkResponse;
  } catch (err) {
    // Network failed: return cached if present, otherwise a minimal fallback
    const fallback = await caches.match(req);
    if (fallback) return fallback;

    // For requests like images, scripts, fonts — return a simple 504 response
    // (don't return offline.html which breaks types).
    return new Response("Network error", {
      status: 504,
      statusText: "Network error",
      headers: { "Content-Type": "text/plain" },
    });
  }
}
