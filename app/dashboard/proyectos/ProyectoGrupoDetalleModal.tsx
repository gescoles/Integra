"use client";

import { X } from "lucide-react";

export type ProyectoGrupoDetalle = {
  nombre: string;
  ciclo: string;
  fechaEntrega: string;
  comentarios: string;
  notaFinal: number | null;
  creadoPorNombre: string;
  alumnosNombres: string[];
  notas: { nombre: string; porcentaje: number; valor: number | null; comentario: string | null }[];
};

export function ProyectoGrupoDetalleModal({ grupo, onClose }: { grupo: ProyectoGrupoDetalle; onClose: () => void }) {
  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto bg-black/40 p-4">
      <div className="my-8 w-full max-w-xl rounded-2xl bg-white p-6 shadow-xl sm:p-8">
        <div className="mb-5 flex items-center justify-between">
          <h2 className="text-lg font-bold text-[#0B1D4D]">{grupo.nombre}</h2>
          <button onClick={onClose} className="rounded p-1 text-slate-400 hover:bg-slate-100">
            <X className="h-4 w-4" />
          </button>
        </div>

        <div className="mb-4 grid grid-cols-2 gap-3 text-sm sm:grid-cols-3">
          <div>
            <div className="text-xs text-slate-400">Ciclo</div>
            <div className="font-semibold text-slate-700">{grupo.ciclo}</div>
          </div>
          <div>
            <div className="text-xs text-slate-400">Fecha de entrega</div>
            <div className="font-semibold text-slate-700">
              {new Date(grupo.fechaEntrega).toLocaleDateString("es-ES")}
            </div>
          </div>
          <div>
            <div className="text-xs text-slate-400">Creado por</div>
            <div className="font-semibold text-slate-700">{grupo.creadoPorNombre}</div>
          </div>
        </div>

        <div className="mb-4">
          <div className="mb-1.5 text-xs font-semibold text-slate-500">Alumnos ({grupo.alumnosNombres.length})</div>
          <div className="flex flex-wrap gap-1.5">
            {grupo.alumnosNombres.map((n, i) => (
              <span key={i} className="rounded-full bg-slate-100 px-2.5 py-1 text-xs font-medium text-slate-600">
                {n}
              </span>
            ))}
          </div>
        </div>

        <div>
          <div className="mb-1.5 text-xs font-semibold text-slate-500">Tipos de nota</div>
          {grupo.notas.length === 0 ? (
            <p className="text-sm text-slate-400">Todavía no se han puesto tipos de nota.</p>
          ) : (
            <div className="space-y-2">
              {grupo.notas.map((n, i) => (
                <div key={i} className="rounded-lg border border-slate-100 p-3">
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-semibold text-slate-700">{n.nombre}</span>
                    <span className="text-xs text-slate-400">
                      {n.porcentaje}% · {n.valor === null ? "sin calificar" : `${n.valor}/10`}
                    </span>
                  </div>
                  {n.comentario && <p className="mt-1 text-xs text-slate-500">{n.comentario}</p>}
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="mt-4">
          <div className="mb-1.5 text-xs font-semibold text-slate-500">Comentarios</div>
          <p className="whitespace-pre-line text-sm text-slate-600">{grupo.comentarios}</p>
        </div>

        <div className="mt-5 rounded-lg bg-slate-50 px-4 py-3 text-center">
          <div className="text-xs text-slate-400">Nota final</div>
          <div className="text-2xl font-bold text-[#0B1D4D]">{grupo.notaFinal ?? "Pendiente"}</div>
        </div>
      </div>
    </div>
  );
}
