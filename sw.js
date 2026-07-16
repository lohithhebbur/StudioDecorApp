// Decor My Nest Studio App service worker
// Strategy: network-first, falling back to cache when offline.
// Bump CACHE_VERSION whenever app files change so old caches are cleared
// and the installed iPad/iPhone app picks up the update.

const CACHE_VERSION = "dmn-v16";

const PRECACHE_URLS = [
  "./",
  "./index.html",
  "./manifest.json",
  "./assets/css/shell.css",
  "./assets/js/shell.js",
  "./assets/css/dashboard.css",
  "./assets/js/dashboard.js",
  "./assets/css/customers.css",
  "./assets/js/customers.js",
  "./assets/css/projects.css",
  "./assets/js/projects.js",
  "./assets/css/quotations.css",
  "./assets/js/quotations.js",
  "./assets/css/project-detail.css",
  "./assets/js/project-detail.js",
  "./Modules/project-detail.html",
  "./assets/css/settings.css",
  "./assets/js/settings.js",
  "./assets/icons/icon-192.png",
  "./assets/icons/icon-512.png",
  "./assets/icons/icon-512-maskable.png",
  "./Modules/dashboard.html",
  "./Modules/customers.html",
  "./Modules/projects.html",
  "./Modules/quotations.html",
  "./Modules/reports.html",
  "./Modules/settings.html",
  "./estimator/index.html",
  "./estimator/styles.css",
  "./estimator/assets/app.js",
  "./estimator/assets/decor-my-nest-logo.jpg"
];

self.addEventListener("install", (event) => {

  self.skipWaiting();

  event.waitUntil(
    caches.open(CACHE_VERSION).then((cache) =>
      // addAll fails the whole install if one URL 404s, so add individually
      // and keep going even if a particular file isn't there yet.
      Promise.all(
        PRECACHE_URLS.map((url) =>
          cache.add(url).catch((err) => console.warn("Precache skipped:", url, err))
        )
      )
    )
  );
});

self.addEventListener("activate", (event) => {

  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(
        keys
          .filter((key) => key !== CACHE_VERSION)
          .map((key) => caches.delete(key))
      )
    )
  );

  self.clients.claim();
});

self.addEventListener("fetch", (event) => {

  const { request } = event;

  // Only handle same-origin GET requests; let everything else (fonts CDN, etc.) pass through normally.
  if (request.method !== "GET" || new URL(request.url).origin !== self.location.origin) {
    return;
  }

  event.respondWith(networkFirst(request));
});

async function networkFirst(request) {

  const cache = await caches.open(CACHE_VERSION);

  try {

    // "no-store" bypasses the browser's own HTTP cache, not just this
    // service worker's — otherwise a fresh deploy can still silently
    // serve an old file the browser considered "not stale yet".
    const networkResponse = await fetch(request, { cache: "no-store" });

    // Only cache good, basic responses.
    if (networkResponse && networkResponse.ok) {
      cache.put(request, networkResponse.clone());
    }

    return networkResponse;

  } catch (err) {

    const cachedResponse = await cache.match(request);

    if (cachedResponse) {
      return cachedResponse;
    }

    // Last resort for navigations while offline with nothing cached yet.
    if (request.mode === "navigate") {
      const fallback = await cache.match("./index.html");
      if (fallback) return fallback;
    }

    throw err;
  }
}
