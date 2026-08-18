/* Minimal shell cache + message pass-through for offline queue flush. */
const CACHE = "grabber-pos-shell-v1";
const SHELL = ["/", "/pos", "/login", "/offline"];

self.addEventListener("install", (event) => {
  event.waitUntil(
    caches.open(CACHE).then((cache) => cache.addAll(SHELL).catch(() => undefined)),
  );
  self.skipWaiting();
});

self.addEventListener("activate", (event) => {
  event.waitUntil(self.clients.claim());
});

self.addEventListener("fetch", (event) => {
  const req = event.request;
  if (req.method !== "GET") return;
  event.respondWith(
    caches.match(req).then((hit) => hit || fetch(req).catch(() => caches.match("/"))),
  );
});

self.addEventListener("message", (event) => {
  if (event.data?.type === "FLUSH_OFFLINE_QUEUE") {
    self.clients.matchAll().then((clients) => {
      for (const c of clients) {
        c.postMessage({ type: "FLUSH_OFFLINE_QUEUE" });
      }
    });
  }
});
