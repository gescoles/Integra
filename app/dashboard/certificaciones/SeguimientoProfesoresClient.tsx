"use client";

import { FileSpreadsheet } from "lucide-react";

type Fila = {
  id: string;
  profesorNombre: string;
  cursoNombre: string;
  categoria: string;
  asignadoPorNombre: string;
  asignadoEl: string;
  programada: boolean;
  cicloFormativo: string | null;
  cursoAcademico: string | null;
  fechaInicioPreparacion: string | null;
  fechaFinPreparacion: string | null;
  fechaExamen: string | null;
  estado: string | null;
  sedeExamen: string | null;
  notas: string | null;
};

const ESTADO_LABEL: Record<string, string> = {
  PROXIMAMENTE: "Próximamente",
  PROGRAMADA: "Programada",
  EN_CURSO: "En curso",
  ACTIVA: "Activa",
  ACABADA: "Acabada",
};

function fecha(iso: string | null) {
  if (!iso) return "—";
  return new Date(iso).toLocaleDateString("es-ES");
}

export function SeguimientoProfesoresClient({ filas, schoolId }: { filas: Fila[]; schoolId: string }) {
  return (
    <div>
      <div className="mb-4 flex items-center justify-between">
        <p className="text-sm text-slate-500">{filas.length} asignación(es) en total.</p>
        <a
          href={`/api/certificaciones/exportar-seguimiento?school=${schoolId}`}
          className="flex items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm font-semibold text-slate-600 hover:border-emerald-400 hover:text-emerald-600"
        >
          <FileSpreadsheet className="h-4 w-4" /> Exportar a Excel
        </a>
      </div>

      <div className="overflow-x-auto rounded-2xl border border-slate-200 bg-white">
        {filas.length === 0 ? (
          <p className="px-4 py-8 text-center text-sm text-slate-400">Todavía no se ha asignado ningún curso.</p>
        ) : (
          <table className="w-full min-w-[900px] text-left text-sm">
            <thead>
              <tr className="border-b border-slate-100 text-xs text-slate-400">
                <th className="px-4 py-3 font-medium">Profesor</th>
                <th className="px-4 py-3 font-medium">Curso</th>
                <th className="px-4 py-3 font-medium">Categoría</th>
                <th className="px-4 py-3 font-medium">Estado</th>
                <th className="px-4 py-3 font-medium">Curso académico</th>
                <th className="px-4 py-3 font-medium">Grupo/Ciclo</th>
                <th className="px-4 py-3 font-medium">Inicio</th>
                <th className="px-4 py-3 font-medium">Fin</th>
                <th className="px-4 py-3 font-medium">Examen</th>
                <th className="px-4 py-3 font-medium">Sede</th>
                <th className="px-4 py-3 font-medium">Asignado por</th>
              </tr>
            </thead>
            <tbody>
              {filas.map((f) => (
                <tr key={f.id} className="border-b border-slate-50 last:border-0">
                  <td className="px-4 py-3 font-medium text-slate-700">{f.profesorNombre}</td>
                  <td className="px-4 py-3 text-slate-500">{f.cursoNombre}</td>
                  <td className="px-4 py-3 text-slate-500">{f.categoria}</td>
                  <td className="px-4 py-3">
                    {f.programada ? (
                      <span className="rounded-full bg-emerald-100 px-2 py-0.5 text-xs font-bold text-emerald-700">
                        {f.estado ? ESTADO_LABEL[f.estado] ?? f.estado : "Programada"}
                      </span>
                    ) : (
                      <span className="rounded-full bg-amber-100 px-2 py-0.5 text-xs font-bold text-amber-700">Pendiente de programar</span>
                    )}
                  </td>
                  <td className="px-4 py-3 text-slate-500">{f.cursoAcademico ?? "—"}</td>
                  <td className="px-4 py-3 text-slate-500">{f.cicloFormativo ?? "—"}</td>
                  <td className="px-4 py-3 text-slate-500">{fecha(f.fechaInicioPreparacion)}</td>
                  <td className="px-4 py-3 text-slate-500">{fecha(f.fechaFinPreparacion)}</td>
                  <td className="px-4 py-3 text-slate-500">{fecha(f.fechaExamen)}</td>
                  <td className="px-4 py-3 text-slate-500">{f.sedeExamen ?? "—"}</td>
                  <td className="px-4 py-3 text-xs text-slate-400">{f.asignadoPorNombre}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}
