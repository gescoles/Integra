"use client";

import { AlertTriangle, ShieldCheck } from "lucide-react";

type AlumnoExpulsion = {
  id: string;
  nombre: string;
  curso: string;
  avatarUrl: string | null;
  totalIncidencias: number;
  expedienteEstado: "BORRADOR" | "ENVIADO" | null;
  expedienteNumero: string | null;
  sancionDias: number | null;
  fechaAplicacionInicio: string | null;
  fechaAplicacionFin: string | null;
};

export function ExpulsionesClient({ alumnos }: { alumnos: AlumnoExpulsion[] }) {
  if (alumnos.length === 0) {
    return (
      <div className="rounded-2xl border border-dashed border-slate-300 bg-white py-20 text-center">
        <ShieldCheck className="mx-auto mb-3 h-10 w-10 text-slate-300" />
        <p className="text-sm font-semibold text-slate-500">Ningún alumno en proceso de expulsión ahora mismo.</p>
        <p className="mt-1 text-xs text-slate-400">
          Aquí aparecerán los alumnos en cuanto se les abra un expediente (borrador o enviado).
        </p>
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
      {alumnos.map((a) => (
        <div key={a.id} className="rounded-2xl border border-red-200 bg-white p-5">
          <div className="mb-3 flex items-center gap-2.5">
            {a.avatarUrl ? (
              <img src={a.avatarUrl} alt="" className="h-10 w-10 rounded-full" />
            ) : (
              <div className="flex h-10 w-10 items-center justify-center rounded-full bg-slate-100 text-xs font-bold text-slate-500">
                {a.nombre.slice(0, 2).toUpperCase()}
              </div>
            )}
            <div>
              <p className="text-sm font-bold text-[#0B1D4D]">{a.nombre}</p>
              <p className="text-xs text-slate-400">{a.curso}</p>
            </div>
          </div>

          <div className="mb-3 flex flex-wrap items-center gap-2">
            {a.expedienteNumero && (
              <span className="rounded-full bg-slate-100 px-2.5 py-1 text-[11px] font-bold text-slate-600">
                Exp. {a.expedienteNumero}
              </span>
            )}
            <span
              className={`rounded-full px-2.5 py-1 text-[11px] font-bold ${
                a.expedienteEstado === "ENVIADO" ? "bg-emerald-100 text-emerald-700" : "bg-amber-100 text-amber-700"
              }`}
            >
              {a.expedienteEstado === "ENVIADO" ? "Enviat" : "Esborrany"}
            </span>
          </div>

          {a.sancionDias && (
            <p className="mb-1 flex items-center gap-1.5 text-xs text-slate-500">
              <AlertTriangle className="h-3 w-3 text-red-400" />
              {a.sancionDias} dies d&apos;expulsió
            </p>
          )}
          {a.fechaAplicacionInicio && a.fechaAplicacionFin && (
            <p className="text-xs text-slate-400">
              {new Date(a.fechaAplicacionInicio).toLocaleDateString("es-ES")} — {new Date(a.fechaAplicacionFin).toLocaleDateString("es-ES")}
            </p>
          )}
        </div>
      ))}
    </div>
  );
}
