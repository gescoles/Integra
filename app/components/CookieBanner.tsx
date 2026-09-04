"use client";

import { useEffect, useState } from "react";
import { usePathname } from "next/navigation";
import { Cookie, Settings, X } from "lucide-react";
import { useSidebarColapsado } from "../dashboard/SchoolContext";

const COOKIE_NAME = "docentium-cookie-consent";
const COOKIE_DIAS = 180;

type Preferencias = {
  necesarias: true; // siempre activas, no se pueden desactivar
  preferencias: boolean;
  analiticas: boolean;
  publicitarias: boolean;
};

const PREFERENCIAS_POR_DEFECTO: Preferencias = {
  necesarias: true,
  preferencias: false,
  analiticas: false,
  publicitarias: false,
};

function leerCookie(nombre: string): string | null {
  if (typeof document === "undefined") return null;
  const match = document.cookie.match(new RegExp(`(?:^|; )${nombre}=([^;]*)`));
  return match ? decodeURIComponent(match[1]) : null;
}

function escribirCookie(nombre: string, valor: string, dias: number) {
  const fecha = new Date();
  fecha.setTime(fecha.getTime() + dias * 24 * 60 * 60 * 1000);
  document.cookie = `${nombre}=${encodeURIComponent(valor)}; expires=${fecha.toUTCString()}; path=/; SameSite=Lax`;
}

export function CookieBanner() {
  const pathname = usePathname();
  const dentroDelDashboard = pathname?.startsWith("/dashboard") ?? false;
  const { colapsado: sidebarColapsado } = useSidebarColapsado();
  const [visible, setVisible] = useState(false);
  const [configurando, setConfigurando] = useState(false);
  const [prefs, setPrefs] = useState<Preferencias>(PREFERENCIAS_POR_DEFECTO);

  useEffect(() => {
    const guardado = leerCookie(COOKIE_NAME);
    if (!guardado) {
      setVisible(true);
      return;
    }
    try {
      const parsed = JSON.parse(guardado) as Preferencias;
      setPrefs({ ...PREFERENCIAS_POR_DEFECTO, ...parsed, necesarias: true });
    } catch {
      setVisible(true);
    }
  }, []);

  function guardar(nuevasPrefs: Preferencias) {
    escribirCookie(COOKIE_NAME, JSON.stringify(nuevasPrefs), COOKIE_DIAS);
    setPrefs(nuevasPrefs);
    setVisible(false);
    setConfigurando(false);
  }

  function aceptarTodas() {
    guardar({ necesarias: true, preferencias: true, analiticas: true, publicitarias: true });
  }

  function rechazarOpcionales() {
    guardar({ necesarias: true, preferencias: false, analiticas: false, publicitarias: false });
  }

  function guardarConfiguracion() {
    guardar(prefs);
  }

  // Botón flotante para reabrir la configuración más tarde — el texto
  // legal promete esto ("panel de configuración disponible en la web").
  if (!visible) {
    return (
      <button
        onClick={() => {
          setConfigurando(true);
          setVisible(true);
        }}
        aria-label="Configurar cookies"
        title="Configurar cookies"
        className={`fixed bottom-4 left-4 z-[300] flex h-11 w-11 items-center justify-center rounded-full bg-[#0B1D4D] text-white shadow-lg transition-transform hover:scale-105 ${
          dentroDelDashboard && !sidebarColapsado ? "lg:left-[272px]" : ""
        }`}
      >
        <Cookie className="h-5 w-5" />
      </button>
    );
  }

  return (
    <div className="fixed inset-x-0 bottom-0 z-[300] flex justify-center p-4">
      <div className="w-full max-w-2xl rounded-2xl border border-slate-200 bg-white p-5 shadow-2xl">
        {!configurando ? (
          <>
            <div className="flex items-start gap-3">
              <Cookie className="mt-0.5 h-5 w-5 shrink-0 text-[#FD5249]" />
              <div className="text-sm text-slate-600">
                <p className="font-bold text-[#0B1D4D]">Usamos cookies</p>
                <p className="mt-1">
                  Utilizamos cookies técnicas necesarias para que la plataforma funcione (como mantener tu
                  sesión iniciada), y, si nos das permiso, también de preferencias, analíticas y
                  publicitarias. Puedes leer más en nuestra{" "}
                  <a href="/cookies" className="font-semibold text-[#FD5249] hover:underline">
                    Política de cookies
                  </a>
                  .
                </p>
              </div>
            </div>
            <div className="mt-4 flex flex-wrap justify-end gap-2">
              <button
                onClick={() => setConfigurando(true)}
                className="flex items-center gap-1.5 rounded-lg border border-slate-200 px-4 py-2 text-sm font-semibold text-slate-600 hover:bg-slate-50"
              >
                <Settings className="h-4 w-4" /> Configurar
              </button>
              <button
                onClick={rechazarOpcionales}
                className="rounded-lg border border-slate-200 px-4 py-2 text-sm font-semibold text-slate-600 hover:bg-slate-50"
              >
                Rechazar
              </button>
              <button
                onClick={aceptarTodas}
                className="rounded-lg bg-[#0B1D4D] px-4 py-2 text-sm font-semibold text-white hover:bg-[#132a68]"
              >
                Aceptar todas
              </button>
            </div>
          </>
        ) : (
          <>
            <div className="flex items-center justify-between">
              <p className="font-bold text-[#0B1D4D]">Configurar cookies</p>
              <button onClick={() => setConfigurando(false)} className="rounded p-1 text-slate-400 hover:bg-slate-100">
                <X className="h-4 w-4" />
              </button>
            </div>

            <div className="mt-3 space-y-3">
              <div className="flex items-center justify-between rounded-lg border border-slate-200 p-3">
                <div>
                  <p className="text-sm font-semibold text-slate-700">Necesarias</p>
                  <p className="text-xs text-slate-400">Imprescindibles para iniciar sesión y navegar. Siempre activas.</p>
                </div>
                <div className="flex h-6 w-11 items-center rounded-full bg-emerald-500 px-0.5">
                  <div className="h-5 w-5 translate-x-5 rounded-full bg-white" />
                </div>
              </div>

              <div className="flex items-center justify-between rounded-lg border border-slate-200 p-3">
                <div>
                  <p className="text-sm font-semibold text-slate-700">Preferencias</p>
                  <p className="text-xs text-slate-400">Recuerdan el idioma y otras configuraciones de visualización.</p>
                </div>
                <button
                  onClick={() => setPrefs((p) => ({ ...p, preferencias: !p.preferencias }))}
                  className={`flex h-6 w-11 items-center rounded-full px-0.5 transition-colors ${prefs.preferencias ? "bg-emerald-500" : "bg-slate-300"}`}
                >
                  <div className={`h-5 w-5 rounded-full bg-white transition-transform ${prefs.preferencias ? "translate-x-5" : "translate-x-0"}`} />
                </button>
              </div>

              <div className="flex items-center justify-between rounded-lg border border-slate-200 p-3">
                <div>
                  <p className="text-sm font-semibold text-slate-700">Analíticas</p>
                  <p className="text-xs text-slate-400">Ayudan a entender de forma agregada cómo se usa la plataforma.</p>
                </div>
                <button
                  onClick={() => setPrefs((p) => ({ ...p, analiticas: !p.analiticas }))}
                  className={`flex h-6 w-11 items-center rounded-full px-0.5 transition-colors ${prefs.analiticas ? "bg-emerald-500" : "bg-slate-300"}`}
                >
                  <div className={`h-5 w-5 rounded-full bg-white transition-transform ${prefs.analiticas ? "translate-x-5" : "translate-x-0"}`} />
                </button>
              </div>

              <div className="flex items-center justify-between rounded-lg border border-slate-200 p-3">
                <div>
                  <p className="text-sm font-semibold text-slate-700">Publicitarias</p>
                  <p className="text-xs text-slate-400">Para publicidad personalizada o medir campañas, si se usan en el futuro.</p>
                </div>
                <button
                  onClick={() => setPrefs((p) => ({ ...p, publicitarias: !p.publicitarias }))}
                  className={`flex h-6 w-11 items-center rounded-full px-0.5 transition-colors ${prefs.publicitarias ? "bg-emerald-500" : "bg-slate-300"}`}
                >
                  <div className={`h-5 w-5 rounded-full bg-white transition-transform ${prefs.publicitarias ? "translate-x-5" : "translate-x-0"}`} />
                </button>
              </div>
            </div>

            <div className="mt-4 flex justify-end gap-2">
              <button
                onClick={rechazarOpcionales}
                className="rounded-lg border border-slate-200 px-4 py-2 text-sm font-semibold text-slate-600 hover:bg-slate-50"
              >
                Rechazar todas
              </button>
              <button
                onClick={guardarConfiguracion}
                className="rounded-lg bg-[#0B1D4D] px-4 py-2 text-sm font-semibold text-white hover:bg-[#132a68]"
              >
                Guardar preferencias
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
