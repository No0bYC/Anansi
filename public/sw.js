// ═══════════════════════════════════════════════════════════════════════════
// ANANSI I:R. — Service Worker minimal (mise en cache de la coquille de l'app)
// ═══════════════════════════════════════════════════════════════════════════
const CACHE_NAME = "anansi-shell-v1";
const APP_SHELL = ["/", "/index.html", "/manifest.json", "/icon-192.png", "/icon-512.png"];

self.addEventListener("install", (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => cache.addAll(APP_SHELL)).catch(() => {})
  );
  self.skipWaiting();
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(keys.filter((k) => k !== CACHE_NAME).map((k) => caches.delete(k)))
    )
  );
  self.clients.claim();
});

// Stratégie : réseau d'abord (données toujours fraîches), repli sur le cache
// hors-ligne pour la coquille de l'app uniquement. Ne touche jamais aux appels
// API/Supabase — seulement les fichiers statiques de l'app elle-même.
self.addEventListener("fetch", (event) => {
  const url = new URL(event.request.url);
  if (event.request.method !== "GET") return;
  if (url.pathname.startsWith("/api/")) return; // jamais mettre en cache le bot
  if (url.hostname.includes("supabase.co")) return; // jamais mettre en cache la base

  event.respondWith(
    fetch(event.request)
      .then((res) => {
        const resClone = res.clone();
        caches.open(CACHE_NAME).then((cache) => cache.put(event.request, resClone)).catch(() => {});
        return res;
      })
      .catch(() => caches.match(event.request))
  );
});
