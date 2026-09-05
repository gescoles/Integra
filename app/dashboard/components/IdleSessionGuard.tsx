"use client";

import { useEffect, useRef, useState } from "react";
import { signOut } from "next-auth/react";
import { LogOut, RefreshCw } from "lucide-react";

const LIMITE_INACTIVIDAD_MS = 10 * 60 * 1000; // 10 minutos sin interactuar
const CUENTA_ATRAS_S = 60; // 1 minuto para responder antes de cerrar sola

const EVENTOS_ACTIVIDAD = ["mousemove", "mousedown", "keydown", "scroll", "touchstart"] as const;

export function IdleSessionGuard() {
  const [mostrarAviso, setMostrarAviso] = useState(false);
  const [segundosRestantes, setSegundosRestantes] = useState(CUENTA_ATRAS_S);
  const ultimaActividadRef = useRef(Date.now());
  const avisoVisibleRef = useRef(false);

  useEffect(() => {
    avisoVisibleRef.current = mostrarAviso;
  }, [mostrarAviso]);

  useEffect(() => {
    function marcarActividad() {
      ultimaActividadRef.current = Date.now();
      // Si ya hay actividad real mientras se muestra el aviso, no lo
      // apagamos solo con tocar la página por detrás (el aviso bloquea
      // el fondo) — se apaga explícitamente con el botón de "Seguir
      // conectado", para que la respuesta sea siempre una decisión clara.
    }

    for (const evento of EVENTOS_ACTIVIDAD) {
      window.addEventListener(evento, marcarActividad, { passive: true });
    }

    const comprobarInactividad = setInterval(() => {
      if (avisoVisibleRef.current) return;
      if (Date.now() - ultimaActividadRef.current >= LIMITE_INACTIVIDAD_MS) {
        setSegundosRestantes(CUENTA_ATRAS_S);
        setMostrarAviso(true);
      }
    }, 1000);

    return () => {
      for (const evento of EVENTOS_ACTIVIDAD) {
        window.removeEventListener(evento, marcarActividad);
      }
      clearInterval(comprobarInactividad);
    };
  }, []);

  useEffect(() => {
    if (!mostrarAviso) return;

    const cuentaAtras = setInterval(() => {
      setSegundosRestantes((prev) => {
        if (prev <= 1) {
          clearInterval(cuentaAtras);
          signOut({ callbackUrl: "/login" });
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(cuentaAtras);
  }, [mostrarAviso]);

  function seguirConectado() {
    ultimaActividadRef.current = Date.now();
    setMostrarAviso(false);
  }

  if (!mostrarAviso) return null;

  return (
    <div className="fixed inset-0 z-[500] flex items-center justify-center bg-black/50 backdrop-blur-sm">
      <div className="mx-4 w-full max-w-sm rounded-2xl bg-white p-6 text-center shadow-2xl">
        <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-full bg-amber-50">
          <span className="text-xl font-bold text-amber-600">{segundosRestantes}</span>
        </div>
        <h2 className="mb-2 text-lg font-bold text-[#0B1D4D]">¿Sigues ahí?</h2>
        <p className="mb-6 text-sm text-slate-500">
          Llevas 10 minutos sin actividad. Por seguridad, tu sesión se cerrará sola en{" "}
          <strong className="text-slate-700">{segundosRestantes}s</strong> si no respondes.
        </p>
        <div className="flex flex-col gap-2 sm:flex-row">
          <button
            onClick={() => signOut({ callbackUrl: "/login" })}
            className="flex flex-1 items-center justify-center gap-2 rounded-lg border border-slate-200 px-4 py-2.5 text-sm font-semibold text-slate-600 hover:bg-slate-50"
          >
            <LogOut className="h-4 w-4" /> Cerrar sesión
          </button>
          <button
            onClick={seguirConectado}
            className="flex flex-1 items-center justify-center gap-2 rounded-lg bg-[#FD5249] px-4 py-2.5 text-sm font-semibold text-white hover:bg-[#D7463E]"
          >
            <RefreshCw className="h-4 w-4" /> Seguir conectado
          </button>
        </div>
      </div>
    </div>
  );
}
