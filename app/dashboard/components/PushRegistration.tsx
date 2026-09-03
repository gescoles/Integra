"use client";

import { useEffect } from "react";
import { registrarDeviceToken } from "../notificationsActions";

// Mismo nombre de clave que usa UserProfileButton.tsx al cerrar sesión
// para poder borrar este token — si cambias uno, cambia el otro.
const DEVICE_TOKEN_KEY = "docentium_push_token";

// No pinta nada en pantalla — solo se encarga de pedir permiso de
// notificaciones y guardar el token del móvil, y SOLO hace algo cuando la
// web se está ejecutando dentro de la app Android (Capacitor). En un
// navegador normal, isNativePlatform() da false y este componente no hace
// nada, así que es seguro tenerlo montado siempre en el layout del
// dashboard sin afectar a quien entra desde el ordenador.
export function PushRegistration() {
  useEffect(() => {
    let cancelado = false;

    async function registrar() {
      // Import dinámico: si @capacitor/core no está disponible en tiempo
      // de ejecución (navegador normal sin la app), no debe romper nada.
      const { Capacitor } = await import("@capacitor/core");
      if (!Capacitor.isNativePlatform()) return;

      const { PushNotifications } = await import("@capacitor/push-notifications");

      const permiso = await PushNotifications.checkPermissions();
      let estado = permiso.receive;
      if (estado === "prompt" || estado === "prompt-with-rationale") {
        const pedido = await PushNotifications.requestPermissions();
        estado = pedido.receive;
      }
      if (estado !== "granted" || cancelado) return;

      // "register" dispara el listener "registration" con el token real
      // (lo da Firebase) — puede tardar un instante, por eso se hace por
      // evento y no esperando un valor de retorno.
      PushNotifications.addListener("registration", (token) => {
        try {
          window.localStorage.setItem(DEVICE_TOKEN_KEY, token.value);
        } catch {
          // Sin localStorage no se puede borrar el token al cerrar sesión
          // más adelante, pero registrarlo ahora funciona igual.
        }
        registrarDeviceToken(token.value).catch(() => {});
      });
      PushNotifications.addListener("registrationError", (err) => {
        console.error("Error registrando notificaciones push:", err);
      });

      await PushNotifications.register();
    }

    registrar().catch((e) => console.error("No se pudo iniciar el registro de notificaciones push:", e));

    return () => {
      cancelado = true;
    };
  }, []);

  return null;
}
