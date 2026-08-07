import Link from "next/link";
import type { LucideIcon } from "lucide-react";

export type AgendaItem = {
  key: string;
  label: string;
  time: Date | null;
  detailLinea1: string;
  detailLinea2?: string;
  href: string;
  colorClase: string;
  icon: LucideIcon;
  disponible: boolean;
};

function formatearCuentaAtras(objetivo: Date) {
  const diffMs = objetivo.getTime() - Date.now();
  if (diffMs <= 0) return null;

  const minutos = Math.round(diffMs / 60000);
  if (minutos < 60) return `En ${minutos} min`;

  const horas = Math.floor(minutos / 60);
  const minutosRestantes = minutos % 60;
  if (horas < 24) {
    return minutosRestantes > 0 ? `En ${horas}h ${minutosRestantes} min` : `En ${horas}h`;
  }

  const dias = Math.floor(horas / 24);
  return `En ${dias} día${dias > 1 ? "s" : ""}`;
}

export function AgendaTimeline({ titulo, items, verMasHref }: { titulo: string; items: AgendaItem[]; verMasHref: string }) {
  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-5">
      <div className="mb-5 flex items-center justify-between">
        <h3 className="text-sm font-bold text-[#0B1D4D]">{titulo}</h3>
        <Link href={verMasHref} className="text-xs font-semibold text-[#FD5249] hover:underline">
          Ver agenda completa
        </Link>
      </div>

      <div className="relative">
        <div className="absolute left-4 right-4 top-4 h-px bg-slate-200" />

        <div className="grid grid-cols-2 gap-y-6 sm:grid-cols-4">
          {items.map((item) => (
            <div key={item.key} className="relative flex flex-col items-start pl-1">
              <div className={`z-10 flex h-3.5 w-3.5 items-center justify-center rounded-full ring-4 ring-white ${item.colorClase}`} />

              {item.disponible && item.time ? (
                <Link href={item.href} className="mt-2 block">
                  <div className="text-sm font-bold text-[#0B1D4D]">
                    {item.time.toLocaleTimeString("es-ES", { hour: "2-digit", minute: "2-digit" })}
                  </div>
                  <div className="mt-0.5 flex items-center gap-1 text-xs font-semibold text-slate-600">
                    <item.icon className="h-3 w-3" />
                    {item.label}
                  </div>
                  <div className="mt-0.5 text-xs text-slate-400">{item.detailLinea1}</div>
                  {item.detailLinea2 && <div className="text-xs text-slate-400">{item.detailLinea2}</div>}
                  {formatearCuentaAtras(item.time) && (
                    <span className="mt-1.5 inline-block rounded-full bg-slate-100 px-2 py-0.5 text-[10px] font-semibold text-slate-500">
                      {formatearCuentaAtras(item.time)}
                    </span>
                  )}
                </Link>
              ) : (
                <div className="mt-2">
                  <div className="flex items-center gap-1 text-xs font-semibold text-slate-400">
                    <item.icon className="h-3 w-3" />
                    {item.label}
                  </div>
                  <div className="mt-0.5 text-xs text-slate-300">
                    {item.disponible ? "Nada para hoy" : "Módulo no contratado"}
                  </div>
                </div>
              )}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
