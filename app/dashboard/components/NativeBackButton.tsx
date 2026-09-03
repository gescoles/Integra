"use client";

import { useEffect } from "react";

// Solo hace algo dentro de la app Android (Capacitor). En un navegador
// normal, isNativePlatform() da false y no se registra nada — el botón
// "atrás" físico del móvil no existe en un ordenador, así que no hay
// nada que interceptar.
//
// Sin esto, el botón "atrás" de Android puede dejar la app en un estado
// raro (pantalla en blanco) al llegar al final del historial. Con el
// plugin, se navega hacia atrás mientras haya historial dentro de la
// propia web, y si ya no queda ninguno, minimiza la app en vez de
// cerrarla de golpe (como hace cualquier app Android normal).
export function NativeBackButton() {
  useEffect(() => {
    let quitarListener: (() => void) | undefined;
    let cancelado = false;

    async function registrar() {
      const { Capacitor } = await import("@capacitor/core");
      if (!Capacitor.isNativePlatform() || cancelado) return;

      const { App } = await import("@capacitor/app");
      const handle = await App.addListener("backButton", ({ canGoBack }) => {
        if (canGoBack) {
          window.history.back();
        } else {
          App.exitApp();
        }
      });
      quitarListener = () => handle.remove();
    }

    registrar().catch((e) => console.error("No se pudo registrar el botón atrás nativo:", e));

    return () => {
      cancelado = true;
      quitarListener?.();
    };
  }, []);

  return null;
}
