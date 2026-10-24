/*
 * Service worker de NEXUS THRIVE. Política deliberadamente mínima:
 *
 *  - Se cachean SOLO archivos públicos e inmutables: /_next/static/*, /icons/*
 *    y la página sin conexión. Nunca documentos, datos RSC, server actions ni
 *    /api: contienen información de la sesión, y así una sesión cerrada no
 *    puede reutilizar nada de la anterior.
 *  - Las navegaciones van siempre a la red; si no hay conexión se muestra
 *    /offline.html (no promete trabajar sin conexión: los datos son del servidor).
 *  - Actualización: la versión nueva espera hasta que la persona pulsa
 *    "Actualizar" (mensaje SKIP_WAITING), para no recargar a media tarea.
 */
const VERSION = "v1";
const STATIC_CACHE = `nexus-static-${VERSION}`;
const OFFLINE_URL = "/offline.html";

self.addEventListener("install", (event) => {
  event.waitUntil(caches.open(STATIC_CACHE).then((cache) => cache.addAll([OFFLINE_URL, "/icons/icon-192.png"])));
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    (async () => {
      const names = await caches.keys();
      await Promise.all(names.filter((n) => n.startsWith("nexus-") && n !== STATIC_CACHE).map((n) => caches.delete(n)));
      await self.clients.claim();
    })(),
  );
});

self.addEventListener("message", (event) => {
  if (event.data && event.data.type === "SKIP_WAITING") self.skipWaiting();
});

const isCacheableStatic = (url) =>
  url.origin === self.location.origin && (url.pathname.startsWith("/_next/static/") || url.pathname.startsWith("/icons/"));

self.addEventListener("fetch", (event) => {
  const { request } = event;
  if (request.method !== "GET") return;
  const url = new URL(request.url);

  if (request.mode === "navigate") {
    event.respondWith(
      fetch(request).catch(async () => (await caches.match(OFFLINE_URL)) || Response.error()),
    );
    return;
  }

  if (isCacheableStatic(url)) {
    event.respondWith(
      caches.match(request).then(
        (hit) =>
          hit ||
          fetch(request).then((response) => {
            if (response.ok) {
              const copy = response.clone();
              caches.open(STATIC_CACHE).then((cache) => cache.put(request, copy));
            }
            return response;
          }),
      ),
    );
  }
  // Todo lo demás (API, RSC, acciones, Clerk): sin tocar, directo a la red.
});
