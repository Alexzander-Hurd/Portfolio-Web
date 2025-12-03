const CACHE_NAME = "alexhurd-site-v1";
const PRECACHE_URLS = [
  "/",
  "/links/",
  "/about/",
  "/images/logo.avif",
  "/offline/",
];

// External badge/icon hosts to cache
const EXTERNAL_ICON_HOSTS = [
  "https://img.shields.io",
  "https://custom-icon-badges.demolab.com",
];

// Install: cache precached URLs
self.addEventListener("install", (event) => {
  event.waitUntil(precacher(PRECACHE_URLS));
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

async function precacher(urls) {
  const cache = await caches.open(CACHE_NAME);

  for (const url of urls) {
    try {
      const res = await fetch(url, { redirect: "follow" });

      if (res.ok || res.type === "opaque") {
        await cache.put(url, res.clone());
        console.log("[SW] precached:", url);
      } else {
        console.warn("[SW] skipped (non-OK):", url, res.status);
      }
    } catch (err) {
      console.warn("[SW] precache failed:", url, err);
    }
  }
}

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
    return caches.match("/offline/");
  }
}

// CACHE-FIRST for same-origin assets
async function cacheFirst(req) {
  const cache = await caches.open(CACHE_NAME);

  const cached = await cache.match(req);
  if (cached) {
    return cached;
  }

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

  // Create a canonical cache key (ignore query parameters)
  const url = new URL(req.url);
  const cacheKey = `${url.origin}${url.pathname}`;

  // Try cache first
  const cached = await cache.match(cacheKey);
  if (cached) return cached;

  try {
    // Try network
    const response = await fetch(req, {
      mode: "cors",
      credentials: "omit",
    });

    if (response && response.ok) {
      // Store under canonical key
      await cache.put(cacheKey, response.clone());
      return response;
    }

    const opaqueResponse = await fetch(req, {
      mode: "no-cors",
      credentials: "omit",
    });

    if (opaqueResponse && opaqueResponse.type === "opaque") {
      await cache.put(cacheKey, opaqueResponse.clone());
      return opaqueResponse;
    }

    console.warn("[SW] external icon returned non-ok:", req.url);
  } catch (err) {
    console.warn("[SW] external icon network fail:", req.url, err);
  }

  // ---------- FALLBACK ----------
  // Create a meaningful fallback icon using the badge label
  const text = extractBadgeLabel(url);

  const fallbackSVG = `
    <svg xmlns="http://www.w3.org/2000/svg" width="120" height="30">
      <rect width="120" height="30" fill="#555"/>
      <text x="60" y="20"
        font-size="12"
        fill="white"
        font-family="Arial, sans-serif"
        text-anchor="middle">
        ${text}
      </text>
    </svg>
  `.trim();

  return new Response(fallbackSVG, {
    headers: { "Content-Type": "image/svg+xml" },
  });
}

// Extract meaningful label from shields.io URL
function extractBadgeLabel(url) {
  // Example: `/badge/-LinkedIn-black.svg`
  const match = url.pathname.match(/badge\/-(.+?)-/);
  if (match) return match[1];
  return "LINK";
}
