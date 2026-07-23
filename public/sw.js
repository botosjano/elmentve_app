/* Elmentve service worker -- minimál, PWA-telepíthetőséghez + könnyű offline.
   Óvatos: network-first, csak same-origin GET-et cache-el, az API/auth kéréseket
   sosem (hogy ne szolgáljon ki elavult vagy privát adatot). */
const CACHE = "elmentve-shell-v1";

self.addEventListener("install", () => self.skipWaiting());

self.addEventListener("activate", (event) => {
  event.waitUntil(
    (async () => {
      const keys = await caches.keys();
      await Promise.all(keys.filter((k) => k !== CACHE).map((k) => caches.delete(k)));
      await self.clients.claim();
    })(),
  );
});

self.addEventListener("fetch", (event) => {
  const req = event.request;
  const url = new URL(req.url);
  // Csak same-origin GET; API/auth/manifest kimarad a cache-ből.
  if (req.method !== "GET" || url.origin !== self.location.origin) return;
  if (url.pathname.startsWith("/api") || url.pathname.startsWith("/auth")) return;

  event.respondWith(
    (async () => {
      try {
        const fresh = await fetch(req);
        if (fresh.ok) {
          const cache = await caches.open(CACHE);
          cache.put(req, fresh.clone());
        }
        return fresh;
      } catch {
        const cached = await caches.match(req);
        if (cached) return cached;
        throw new Error("offline");
      }
    })(),
  );
});
