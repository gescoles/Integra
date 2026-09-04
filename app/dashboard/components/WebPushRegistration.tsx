"use client";

import { useEffect, useState } from "react";
import { Bell, X } from "lucide-react";
import { registrarWebPushSubscription, eliminarWebPushSubscription } from "../notificationsActions";

// Mismo nombre de clave que usa PushRegistration.tsx (Android) y
// UserProfileButton.tsx al cerrar sesión, pero para Web Push — así se
// puede borrar la suscripción de este navegador al salir de la cuenta.
export const WEB_PUSH_ENDPOINT_KEY = "docentium_webpush_endpoint";

const AVISO_DESCARTADO_KEY = "docentium_webpush_aviso_descartado";

function urlBase64ToUint8Array(base64String: string) {
  const padding = "=".repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/-/g, "+").replace(/_/g, "/");
  const rawData = window.atob(base64);
  const outputArray = new Uint8Array(rawData.length);
  for (let i = 0; i < rawData.length; i++) {
    outputArray[i] = rawData.charCodeAt(i);
  }
  return outputArray;
}

// Compara la clave con la que se creó una suscripción ya existente contra
// la clave VAPID actual — si en algún momento se cambiaron las claves (o
// se suscribió antes de que estuvieran bien puestas en el servidor), el
// navegador se queda con una suscripción "vieja" que getSubscription()
// sigue devolviendo de toda la vida, y el envío falla en silencio para
// siempre (ni siquiera con un error que se pueda limpiar solo). Hay que
// detectarlo y volver a suscribir con la clave buena.
function mismaClave(subscription: PushSubscription, publicKey: string) {
  const actual = subscription.options?.applicationServerKey;
  if (!actual) return true; // navegadores que no exponen options: se asume que sí, no se puede comprobar
  const esperada = urlBase64ToUint8Array(publicKey);
  const actualBytes = new Uint8Array(actual);
  if (actualBytes.length !== esperada.length) return false;
  return actualBytes.every((b, i) => b === esperada[i]);
}

async function suscribir(publicKey: string) {
  const registration = await navigator.serviceWorker.ready;
  let subscription = await registration.pushManager.getSubscription();

  if (subscription && !mismaClave(subscription, publicKey)) {
    const endpointViejo = subscription.endpoint;
    await subscription.unsubscribe();
    eliminarWebPushSubscription(endpointViejo).catch(() => {});
    subscription = null;
  }

  if (!subscription) {
    subscription = await registration.pushManager.subscribe({
      userVisibleOnly: true,
      applicationServerKey: urlBase64ToUint8Array(publicKey),
    });
  }

  const json = subscription.toJSON();
  if (!json.endpoint || !json.keys?.p256dh || !json.keys?.auth) return;

  try {
    window.localStorage.setItem(WEB_PUSH_ENDPOINT_KEY, json.endpoint);
  } catch {
    // Sin localStorage no se puede borrar al cerrar sesión, pero
    // registrar la suscripción ahora funciona igual.
  }

  await registrarWebPushSubscription({
    endpoint: json.endpoint,
    p256dh: json.keys.p256dh,
    auth: json.keys.auth,
  });
}

// Pide permiso de notificaciones y suscribe este navegador a Web Push,
// para poder recibir avisos aunque la web esté cerrada (funciona en
// Android y en iPhone/iPad SI la web está "añadida a pantalla de
// inicio"; en una pestaña normal del navegador, iOS ni siquiera deja
// pedir el permiso).
//
// El permiso hay que pedirlo con un botón de verdad: si se pide solo,
// nada más cargar la página, Chrome lo bloquea automáticamente (lo trata
// como una petición "abusiva", sin avisar de que lo ha hecho) — por eso
// esto pinta un aviso pequeño con un botón en vez de pedirlo en
// silencio.
//
// Dentro de la app Android (Capacitor) esto no hace nada: esa ya tiene su
// propio sistema (Firebase/PushRegistration.tsx) — no hace falta este
// también, y evita pedir el permiso dos veces con dos sistemas distintos.
export function WebPushRegistration() {
  const [publicKey, setPublicKey] = useState<string | null>(null);
  const [mostrarAviso, setMostrarAviso] = useState(false);
  const [pidiendo, setPidiendo] = useState(false);

  useEffect(() => {
    let cancelado = false;

    async function comprobar() {
      const { Capacitor } = await import("@capacitor/core");
      if (Capacitor.isNativePlatform()) return;

      if (!("serviceWorker" in navigator) || !("PushManager" in window) || !("Notification" in window)) return;

      const clave = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY;
      if (!clave) return;

      // Si ya tenía el permiso concedido de antes, se suscribe solo, en
      // silencio — eso sí lo permiten los navegadores sin interacción,
      // porque no hace falta volver a preguntar nada.
      if (Notification.permission === "granted") {
        suscribir(clave).catch((e) => console.error("No se pudo suscribir a Web Push:", e));
        return;
      }

      // Si ya lo rechazó antes, o ya descartó el aviso en esta sesión, no
      // insistimos.
      if (Notification.permission === "denied") return;
      if (sessionStorage.getItem(AVISO_DESCARTADO_KEY)) return;

      if (!cancelado) {
        setPublicKey(clave);
        setMostrarAviso(true);
      }
    }

    comprobar().catch((e) => console.error("No se pudo comprobar Web Push:", e));

    return () => {
      cancelado = true;
    };
  }, []);

  async function handleActivar() {
    if (!publicKey) return;
    setPidiendo(true);
    try {
      const permiso = await Notification.requestPermission();
      if (permiso === "granted") {
        await suscribir(publicKey);
      }
    } catch (e) {
      console.error("No se pudo activar Web Push:", e);
    } finally {
      setPidiendo(false);
      setMostrarAviso(false);
    }
  }

  function handleDescartar() {
    setMostrarAviso(false);
    try {
      sessionStorage.setItem(AVISO_DESCARTADO_KEY, "1");
    } catch {
      // No pasa nada si no se puede recordar — como mucho, se le
      // preguntará otra vez en la próxima visita.
    }
  }

  if (!mostrarAviso) return null;

  return (
    <div className="fixed inset-x-4 top-[calc(env(safe-area-inset-top,0px)+4.5rem)] z-40 mx-auto flex max-w-sm items-center gap-3 rounded-xl border border-slate-200 bg-white p-3.5 shadow-lg sm:right-6 sm:left-auto">
      <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-red-50 text-[#FD5249]">
        <Bell className="h-4 w-4" />
      </div>
      <div className="min-w-0 flex-1">
        <p className="text-sm font-semibold text-slate-700">Activar notificaciones</p>
        <p className="text-xs text-slate-500">Recibe avisos de Docentium aunque no tengas la web abierta.</p>
      </div>
      <button
        onClick={handleActivar}
        disabled={pidiendo}
        className="shrink-0 rounded-lg bg-[#FD5249] px-3 py-2 text-xs font-semibold text-white hover:bg-[#D7463E] disabled:opacity-60"
      >
        {pidiendo ? "..." : "Activar"}
      </button>
      <button onClick={handleDescartar} className="shrink-0 rounded p-1 text-slate-300 hover:bg-slate-100">
        <X className="h-4 w-4" />
      </button>
    </div>
  );
}
