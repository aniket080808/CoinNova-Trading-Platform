// CoinNova — Service Worker (Lightweight Static Asset Cache)
const CACHE_NAME = "coinnova-v1";
const PRECACHE_URLS = ["/", "/dashboard"];

self.addEventListener("install", (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => cache.addAll(PRECACHE_URLS))
  );
  self.skipWaiting();
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(
        keys
          .filter((key) => key !== CACHE_NAME)
          .map((key) => caches.delete(key))
      )
    )
  );
  self.clients.claim();
});

self.addEventListener("fetch", (event) => {
  // Only cache GET requests for static assets
  if (event.request.method !== "GET") return;
  
  const url = new URL(event.request.url);
  
  // Skip API calls and external URLs
  if (url.pathname.startsWith("/auth") || 
      url.pathname.startsWith("/wallet") || 
      url.pathname.startsWith("/trades") ||
      url.pathname.startsWith("/admin") ||
      url.pathname.startsWith("/coins") ||
      url.pathname.startsWith("/ai") ||
      url.pathname.startsWith("/kyc") ||
      url.pathname.startsWith("/referrals") ||
      url.pathname.startsWith("/notifications") ||
      url.pathname.startsWith("/orders") ||
      url.origin !== self.location.origin) {
    return;
  }

  event.respondWith(
    caches.match(event.request).then((cached) => {
      // Network first, fall back to cache for navigation
      return fetch(event.request)
        .then((response) => {
          // Cache successful responses for static assets
          if (response.ok && (url.pathname.endsWith(".js") || url.pathname.endsWith(".css") || url.pathname.endsWith(".svg"))) {
            const clone = response.clone();
            caches.open(CACHE_NAME).then((cache) => cache.put(event.request, clone));
          }
          return response;
        })
        .catch(() => cached || new Response("Offline", { status: 503 }));
    })
  );
});
