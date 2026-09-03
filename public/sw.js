// Service worker de Docentium — solo se encarga de las notificaciones Web
// Push (recibirlas y abrir la app al tocarlas). No cachea nada de la web
// a propósito: Docentium siempre tiene que mostrar datos en vivo, no una
// versión guardada de hace un rato.

self.addEventListener("install", () => {
  self.skipWaiting();
});

self.addEventListener("activate", (event) => {
  event.waitUntil(self.clients.claim());
});

self.addEventListener("push", (event) => {
  if (!event.data) return;

  let data;
  try {
    data = event.data.json();
  } catch {
    data = { title: "Docentium", body: event.data.text() };
  }

  const titulo = data.title || "Docentium";
  const opciones = {
    body: data.body || "",
    icon: "/icons/icon-192.png",
    badge: "/icons/icon-192.png",
    data: { link: data.link || "/dashboard" },
  };

  event.waitUntil(self.registration.showNotification(titulo, opciones));
});

// Al tocar la notificación: si ya hay una pestaña/ventana de Docentium
// abierta, la enfoca y la lleva a la página del aviso; si no, abre una
// nueva.
self.addEventListener("notificationclick", (event) => {
  event.notification.close();
  const link = event.notification.data?.link || "/dashboard";

  event.waitUntil(
    self.clients.matchAll({ type: "window", includeUncontrolled: true }).then((clientList) => {
      for (const client of clientList) {
        if ("focus" in client) {
          client.navigate(link);
          return client.focus();
        }
      }
      if (self.clients.openWindow) {
        return self.clients.openWindow(link);
      }
    })
  );
});
