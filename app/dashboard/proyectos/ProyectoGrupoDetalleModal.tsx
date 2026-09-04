"use client";

import { X } from "lucide-react";
import type { TipoNota } from "./ProyectoGrupoFormModal";

export type ProyectoGrupoDetalle = {
  nombre: string;
  fechaEntrega: string;
  comentarios: string;
  notaFinal: number | null;
  creadoPorNombre: string;
  alumnosNombres: string[];
  notas: { tipoNotaId: string; valor: number | null; comentario: string | null }[];
};

export function ProyectoGrupoDetalleModal({
  grupo,
  tiposNota,
  onClose,
}: {
  grupo: ProyectoGrupoDetalle;
  tiposNota: TipoNota[];
  onClose: () => void;
}) {
  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto bg-black/40 p-4">
      <div className="my-8 w-full max-w-xl rounded-2xl bg-white p-6 shadow-xl sm:p-8">
        <div className="mb-5 flex items-center justify-between">
          <h2 className="text-lg font-bold text-[#0B1D4D]">{grupo.nombre}</h2>
          <button onClick={onClose} className="rounded p-1 text-slate-400 hover:bg-slate-100">
            <X className="h-4 w-4" />
          </button>
        </div>

        <div className="mb-4 grid grid-cols-2 gap-3 text-sm">
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
          <div className="mb-1.5 text-xs font-semibold text-slate-500">Notas</div>
          <div className="space-y-2">
            {tiposNota.map((t) => {
              const nota = grupo.notas.find((n) => n.tipoNotaId === t.id);
              return (
                <div key={t.id} className="rounded-lg border border-slate-100 p-3">
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-semibold text-slate-700">
                      {t.nombre} <span className="font-normal text-slate-400">({t.porcentaje}%)</span>
                    </span>
                    <span className="text-xs text-slate-400">
                      {nota?.valor === null || nota?.valor === undefined ? "sin calificar" : `${nota.valor}/10`}
                    </span>
                  </div>
                  {nota?.comentario && <p className="mt-1 text-xs text-slate-500">{nota.comentario}</p>}
                </div>
              );
            })}
          </div>
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
