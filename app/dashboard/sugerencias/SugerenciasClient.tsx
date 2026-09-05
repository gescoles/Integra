"use client";

import { useState } from "react";
import { ChevronDown, Plus } from "lucide-react";
import { SugerenciaFormModal } from "./SugerenciaFormModal";

export type Sugerencia = {
  id: string;
  titulo: string;
  detalle: string;
  departamentoNombre: string | null;
  createdAt: string;
};

function formatFechaHora(iso: string): string {
  const d = new Date(iso);
  const fecha = d.toLocaleDateString("es-ES", { day: "2-digit", month: "2-digit", year: "numeric" });
  const hora = d.toLocaleTimeString("es-ES", { hour: "2-digit", minute: "2-digit" });
  return `${fecha} · ${hora}`;
}

export function SugerenciasClient({
  sugerencias,
  departamentos,
  esDirectivo,
  schoolId,
}: {
  sugerencias: Sugerencia[];
  departamentos: { id: string; nombre: string }[];
  esDirectivo: boolean;
  schoolId?: string;
}) {
  const [expandidos, setExpandidos] = useState<Set<string>>(new Set());
  const [modalAbierto, setModalAbierto] = useState(false);

  function toggleExpandido(id: string) {
    setExpandidos((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  return (
    <div>
      <div className="mb-4 flex items-center justify-between">
        <p className="text-sm text-slate-500">
          {esDirectivo
            ? "Todas las sugerencias del centro. Son anónimas: no se muestra quién las ha escrito."
            : "Aquí ves solo las sugerencias que has enviado tú."}
        </p>
        <button
          onClick={() => setModalAbierto(true)}
          className="inline-flex shrink-0 items-center gap-1.5 rounded-lg bg-[#FD5249] px-4 py-2.5 text-sm font-semibold text-white hover:bg-[#D7463E]"
        >
          <Plus className="h-4 w-4" /> Nueva sugerencia
        </button>
      </div>

      {sugerencias.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-slate-300 bg-white py-24 text-center text-sm text-slate-400">
          {esDirectivo ? "Todavía no hay ninguna sugerencia." : "Todavía no has enviado ninguna sugerencia."}
        </div>
      ) : (
        <div className="space-y-3">
          {sugerencias.map((s) => {
            const abierto = expandidos.has(s.id);
            return (
              <div key={s.id} className="rounded-2xl border border-slate-200 bg-white">
                <button
                  onClick={() => toggleExpandido(s.id)}
                  className="flex w-full items-center justify-between gap-3 px-5 py-4 text-left"
                >
                  <div className="flex min-w-0 flex-wrap items-baseline gap-x-2.5 gap-y-1">
                    <span className="font-bold text-[#0B1D4D]">{s.titulo}</span>
                    <span className="text-xs text-slate-400">{formatFechaHora(s.createdAt)}</span>
                  </div>
                  <ChevronDown className={`h-4 w-4 shrink-0 text-slate-400 transition-transform ${abierto ? "rotate-180" : ""}`} />
                </button>

                {abierto && (
                  <div className="border-t border-slate-100 px-5 py-4">
                    {s.departamentoNombre && (
                      <span className="mb-2 inline-block rounded-full bg-slate-100 px-2.5 py-1 text-[11px] font-semibold text-slate-500">
                        {s.departamentoNombre}
                      </span>
                    )}
                    <p className="whitespace-pre-line text-sm text-slate-600">{s.detalle}</p>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {modalAbierto && (
        <SugerenciaFormModal departamentos={departamentos} schoolId={schoolId} onClose={() => setModalAbierto(false)} />
      )}
    </div>
  );
}
