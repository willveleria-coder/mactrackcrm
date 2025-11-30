const CACHE = "mac-track-driver-v1";
const ASSETS = [
  "/driver",
  "/driver/login",
  "/driver/orders",
  "/driver/dashboard",
  "/driver/profile",
  "/driver-manifest.webmanifest"
];

self.addEventListener("install", e => {
  e.waitUntil(caches.open(CACHE).then(cache => cache.addAll(ASSETS)));
});

self.addEventListener("fetch", e => {
  if (e.request.method !== "GET") return;

  e.respondWith(
    caches.match(e.request).then(cached =>
      cached ||
      fetch(e.request).then(response => {
        const copy = response.clone();
        caches.open(CACHE).then(cache => cache.put(e.request, copy));
        return response;
      })
    )
  );
});