"use client";

import { useMemo, useState } from "react";
import { Search, UserX, CalendarDays, Clock, ArrowUpDown } from "lucide-react";

type Fila = { id: string; nombre: string; veces: number; dias: number; horas: number };

// Mismo criterio de color que ya usamos en Tutorías, pero al revés: aquí
// cuantas más faltas, peor (rojo), no al contrario.
function colorNivel(veces: number) {
  if (veces >= 6) return { chip: "bg-red-50 text-red-600 border-red-200", barra: "bg-red-500" };
  if (veces >= 3) return { chip: "bg-amber-50 text-amber-600 border-amber-200", barra: "bg-amber-500" };
  return { chip: "bg-emerald-50 text-emerald-600 border-emerald-200", barra: "bg-emerald-500" };
}

type Orden = "veces" | "dias" | "horas" | "nombre";

export function AbsentismoClient({ filas }: { filas: Fila[] }) {
  const [busqueda, setBusqueda] = useState("");
  const [orden, setOrden] = useState<Orden>("veces");

  const maxVeces = useMemo(() => Math.max(1, ...filas.map((f) => f.veces)), [filas]);

  const filtradas = useMemo(() => {
    const q = busqueda.trim().toLowerCase();
    const base = q ? filas.filter((f) => f.nombre.toLowerCase().includes(q)) : filas;
    return [...base].sort((a, b) => {
      if (orden === "nombre") return a.nombre.localeCompare(b.nombre);
      return b[orden] - a[orden];
    });
  }, [filas, busqueda, orden]);

  if (filas.length === 0) {
    return (
      <div className="rounded-2xl border border-dashed border-slate-300 bg-white py-20 text-center">
        <UserX className="mx-auto mb-3 h-10 w-10 text-slate-300" />
        <p className="text-sm font-semibold text-slate-500">Todavía no hay ninguna ausencia registrada.</p>
        <p className="mt-1 text-xs text-slate-400">En cuanto alguien avise de que falta, aparecerá aquí.</p>
      </div>
    );
  }

  return (
    <div>
      <div className="mb-5 flex flex-wrap items-center gap-3">
        <div className="relative min-w-[240px] flex-1">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
          <input
            value={busqueda}
            onChange={(e) => setBusqueda(e.target.value)}
            placeholder="Buscar profesor/a..."
            className="w-full rounded-lg border border-slate-200 py-2.5 pl-9 pr-3 text-sm outline-none focus:border-[#FD5249]"
          />
        </div>

        <div className="flex items-center gap-1.5 rounded-lg bg-slate-100 p-1">
          {([
            ["veces", "Nº de veces"],
            ["dias", "Nº de días"],
            ["horas", "Horas totales"],
            ["nombre", "Nombre"],
          ] as [Orden, string][]).map(([valor, etiqueta]) => (
            <button
              key={valor}
              onClick={() => setOrden(valor)}
              className={`inline-flex items-center gap-1 rounded-md px-2.5 py-1.5 text-xs font-semibold transition-colors ${
                orden === valor ? "bg-white text-[#FD5249] shadow-sm" : "text-slate-500 hover:text-slate-700"
              }`}
            >
              {valor !== "nombre" && <ArrowUpDown className="h-3 w-3" />}
              {etiqueta}
            </button>
          ))}
        </div>
      </div>

      {filtradas.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-slate-300 bg-white py-16 text-center text-sm text-slate-400">
          Ningún profesor coincide con &quot;{busqueda}&quot;.
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {filtradas.map((f) => {
            const color = colorNivel(f.veces);
            const anchoBarra = Math.round((f.veces / maxVeces) * 100);
            return (
              <div key={f.id} className="rounded-2xl border border-slate-200 bg-white p-5 transition-shadow hover:shadow-md">
                <div className="mb-4 flex items-center justify-between">
                  <div className="flex items-center gap-2.5">
                    <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-slate-100 text-xs font-bold text-slate-500">
                      {f.nombre.slice(0, 2).toUpperCase()}
                    </div>
                    <p className="text-sm font-bold text-[#0B1D4D]">{f.nombre}</p>
                  </div>
                  <span className={`rounded-full border px-2 py-0.5 text-[11px] font-bold ${color.chip}`}>
                    {f.veces >= 6 ? "Alto" : f.veces >= 3 ? "Medio" : "Bajo"}
                  </span>
                </div>

                <div className="mb-3 h-1.5 w-full overflow-hidden rounded-full bg-slate-100">
                  <div className={`h-full rounded-full ${color.barra}`} style={{ width: `${anchoBarra}%` }} />
                </div>

                <div className="grid grid-cols-3 gap-2 text-center">
                  <div className="rounded-lg bg-slate-50 py-2.5">
                    <p className="text-lg font-extrabold text-[#0B1D4D]">{f.veces}</p>
                    <p className="text-[10px] font-semibold uppercase tracking-wide text-slate-400">Veces</p>
                  </div>
                  <div className="rounded-lg bg-slate-50 py-2.5">
                    <p className="flex items-center justify-center gap-1 text-lg font-extrabold text-[#0B1D4D]">
                      <CalendarDays className="h-3.5 w-3.5 text-slate-300" />
                      {f.dias}
                    </p>
                    <p className="text-[10px] font-semibold uppercase tracking-wide text-slate-400">Días</p>
                  </div>
                  <div className="rounded-lg bg-slate-50 py-2.5">
                    <p className="flex items-center justify-center gap-1 text-lg font-extrabold text-[#0B1D4D]">
                      <Clock className="h-3.5 w-3.5 text-slate-300" />
                      {f.horas}
                    </p>
                    <p className="text-[10px] font-semibold uppercase tracking-wide text-slate-400">Horas</p>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
