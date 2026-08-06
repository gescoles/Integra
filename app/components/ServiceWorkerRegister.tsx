"use client";

import { useEffect } from "react";

export function ServiceWorkerRegister() {
  useEffect(() => {
    if ("serviceWorker" in navigator) {
      navigator.serviceWorker.register("/sw.js").catch(() => {
        // Si falla el registro (por ejemplo, en local con http en vez de
        // https), la web sigue funcionando exactamente igual, solo que sin
        // el añadido de "instalable" con caché mínima.
      });
    }
  }, []);

  return null;
}
