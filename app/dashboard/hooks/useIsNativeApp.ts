"use client";

import { useEffect, useState } from "react";

// Puramente visual: dice si la web se está ejecutando dentro de la app
// Android (Capacitor) o en un navegador normal, para poder mostrar cosas
// como la barra de navegación inferior solo dentro de la app — no toca
// ninguna lógica de negocio, es solo para decidir qué interfaz pintar.
// Empieza en false (server-safe) y se actualiza en cuanto el navegador
// confirma la plataforma real.
export function useIsNativeApp() {
  const [esNativo, setEsNativo] = useState(false);

  useEffect(() => {
    let cancelado = false;
    import("@capacitor/core").then(({ Capacitor }) => {
      if (!cancelado) setEsNativo(Capacitor.isNativePlatform());
    });
    return () => {
      cancelado = true;
    };
  }, []);

  return esNativo;
}
