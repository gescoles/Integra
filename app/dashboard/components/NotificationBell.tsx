"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { Bell, CheckCheck } from "lucide-react";
import { getMyNotifications, marcarNotificacionLeida, marcarTodasLeidas } from "../notificationsActions";
import { useLocale } from "../SchoolContext";
import { translate } from "../i18n";

type Notif = {
  id: string;
  tipo: string;
  titulo: string;
  mensaje: string;
  link: string | null;
  leida: boolean;
  createdAt: string;
};

function tiempoRelativo(iso: string, locale: string) {
  const diffMs = Date.now() - new Date(iso).getTime();
  const mins = Math.floor(diffMs / 60000);
  if (mins < 1) return translate(locale as never, "notif.ahoraMismo");
  if (mins < 60) return `${translate(locale as never, "notif.hace")} ${mins} min`;
  const horas = Math.floor(mins / 60);
  if (horas < 24) return `${translate(locale as never, "notif.hace")} ${horas} h`;
  const dias = Math.floor(horas / 24);
  return `${translate(locale as never, "notif.hace")} ${dias} d`;
}

export function NotificationBell() {
  const router = useRouter();
  const { locale } = useLocale();
  const [open, setOpen] = useState(false);
  const [notificaciones, setNotificaciones] = useState<Notif[]>([]);
  const [noLeidas, setNoLeidas] = useState(0);
  const containerRef = useRef<HTMLDivElement>(null);

  async function cargar() {
    const data = await getMyNotifications();
    setNotificaciones(data.notificaciones);
    setNoLeidas(data.noLeidas);
  }

  useEffect(() => {
    cargar();
    // Comprobamos cada 30s si han llegado notificaciones nuevas, sin que el
    // usuario tenga que recargar la página a mano.
    const id = setInterval(cargar, 30000);
    return () => clearInterval(id);
  }, []);

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  async function handleClickNotif(n: Notif) {
    if (!n.leida) {
      setNotificaciones((prev) => prev.map((x) => (x.id === n.id ? { ...x, leida: true } : x)));
      setNoLeidas((prev) => Math.max(0, prev - 1));
      marcarNotificacionLeida(n.id);
    }
    setOpen(false);
    if (n.link) router.push(n.link);
  }

  async function handleMarcarTodas() {
    setNotificaciones((prev) => prev.map((n) => ({ ...n, leida: true })));
    setNoLeidas(0);
    await marcarTodasLeidas();
  }

  return (
    <div ref={containerRef} className="relative">
      <button
        onClick={() => setOpen((v) => !v)}
        className="relative rounded-lg border border-slate-200 bg-white p-2.5 hover:bg-slate-50"
      >
        <Bell className="h-4 w-4 text-slate-500" />
        {noLeidas > 0 && (
          <span className="absolute -right-1 -top-1 flex h-4 min-w-4 items-center justify-center rounded-full bg-red-500 px-1 text-[9px] font-bold text-white">
            {noLeidas > 9 ? "9+" : noLeidas}
          </span>
        )}
      </button>

      {open && (
        <div className="absolute right-0 top-full z-30 mt-2 w-80 overflow-hidden rounded-xl border border-slate-200 bg-white shadow-xl">
          <div className="flex items-center justify-between border-b border-slate-100 px-4 py-3">
            <span className="text-sm font-bold text-[#0B1D4D]">{translate(locale, "notif.titulo")}</span>
            {noLeidas > 0 && (
              <button
                onClick={handleMarcarTodas}
                className="flex items-center gap-1 text-xs font-semibold text-[#FD5249] hover:underline"
              >
                <CheckCheck className="h-3.5 w-3.5" />
                {translate(locale, "notif.marcarTodas")}
              </button>
            )}
          </div>

          <div className="max-h-96 overflow-y-auto">
            {notificaciones.length === 0 ? (
              <p className="px-4 py-10 text-center text-sm text-slate-400">{translate(locale, "notif.sinNotificaciones")}</p>
            ) : (
              notificaciones.map((n) => (
                <button
                  key={n.id}
                  onClick={() => handleClickNotif(n)}
                  className={`flex w-full flex-col gap-0.5 border-b border-slate-50 px-4 py-3 text-left last:border-0 hover:bg-slate-50 ${
                    !n.leida ? "bg-blue-50/50" : ""
                  }`}
                >
                  <div className="flex items-center gap-2">
                    {!n.leida && <span className="h-1.5 w-1.5 shrink-0 rounded-full bg-[#FD5249]" />}
                    <span className="text-sm font-semibold text-slate-700">{n.titulo}</span>
                  </div>
                  <p className="text-xs text-slate-500">{n.mensaje}</p>
                  <span className="text-[10px] text-slate-400">{tiempoRelativo(n.createdAt, locale)}</span>
                </button>
              ))
            )}
          </div>
        </div>
      )}
    </div>
  );
}
