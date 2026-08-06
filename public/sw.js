// Service worker deliberadamente sencillo: NO cachea agresivamente (para no
// arriesgarnos a servir una versión vieja de la app después de cada
// despliegue). Solo existe para que el navegador considere la web
// "instalable" como PWA y para dar una respuesta mínima si el usuario se
// queda sin conexión un instante.

const CACHE_NAME = "integra-shell-v1";

self.addEventListener("install", () => {
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

self.addEventListener("fetch", (event) => {
  if (event.request.method !== "GET") return;

  event.respondWith(
    fetch(event.request)
      .then((res) => {
        if (event.request.mode === "navigate" && res.ok) {
          const copia = res.clone();
          caches.open(CACHE_NAME).then((cache) => cache.put(event.request, copia));
        }
        return res;
      })
      .catch(() => caches.match(event.request))
  );
});
