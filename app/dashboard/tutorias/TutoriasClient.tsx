"use client";

import { useMemo, useState, useTransition } from "react";
import { Search, Plus, X } from "lucide-react";
import { updateTutoriaStatus, createTutoria } from "./actions";
import { TUTORIA_STATUS_LABELS, TUTORIA_STATUS_COLORS } from "../constants";

type Row = {
  id: string;
  studentName: string;
  cicloModulo: string | null;
  status: string;
  sessionDate: string;
  profesorId: string;
  profesorName: string;
};

type ProfesorOption = { id: string; name: string };

export function TutoriasClient({
  rows,
  profesores,
}: {
  rows: Row[];
  profesores: ProfesorOption[];
}) {
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("Todos");
  const [profesorFilter, setProfesorFilter] = useState("Todos");
  const [isPending, startTransition] = useTransition();
  const [createOpen, setCreateOpen] = useState(false);
  const [createError, setCreateError] = useState<string | null>(null);
  const [creating, startCreateTransition] = useTransition();

  async function handleCreate(formData: FormData) {
    setCreateError(null);
    startCreateTransition(async () => {
      try {
        await createTutoria(formData);
        setCreateOpen(false);
      } catch (e) {
        setCreateError(e instanceof Error ? e.message : "No se pudo crear la tutoría.");
      }
    });
  }

  const filtered = useMemo(() => {
    const q = search.toLowerCase();
    return rows.filter((r) => {
      if (
        q &&
        !r.studentName.toLowerCase().includes(q) &&
        !(r.cicloModulo ?? "").toLowerCase().includes(q)
      )
        return false;
      if (statusFilter !== "Todos" && r.status !== statusFilter) return false;
      if (profesorFilter !== "Todos" && r.profesorId !== profesorFilter) return false;
      return true;
    });
  }, [rows, search, statusFilter, profesorFilter]);

  function handleStatusChange(id: string, status: string) {
    startTransition(() => {
      updateTutoriaStatus(id, status as never);
    });
  }

  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-5">
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <div className="flex flex-1 flex-wrap gap-3">
          <div className="relative min-w-[220px] flex-1">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Buscar por alumno o ciclo/módulo..."
              className="w-full rounded-lg border border-slate-200 py-2 pl-9 pr-3 text-sm outline-none focus:border-[#2F6FED]"
            />
          </div>
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="rounded-lg border border-slate-200 px-3 py-2 text-sm outline-none focus:border-[#2F6FED]"
          >
            <option value="Todos">Todos los estados</option>
            {Object.entries(TUTORIA_STATUS_LABELS).map(([value, label]) => (
              <option key={value} value={value}>
                {label}
              </option>
            ))}
          </select>
          <select
            value={profesorFilter}
            onChange={(e) => setProfesorFilter(e.target.value)}
            className="rounded-lg border border-slate-200 px-3 py-2 text-sm outline-none focus:border-[#2F6FED]"
          >
            <option value="Todos">Todos los profesores</option>
            {profesores.map((p) => (
              <option key={p.id} value={p.id}>
                {p.name}
              </option>
            ))}
          </select>
        </div>
        <button
          onClick={() => setCreateOpen(true)}
          className="inline-flex items-center gap-2 rounded-lg bg-[#2F6FED] px-4 py-2.5 text-sm font-semibold text-white hover:bg-[#255ed1]"
        >
          <Plus className="h-4 w-4" /> Nueva tutoría
        </button>
      </div>

      {filtered.length === 0 ? (
        <div className="rounded-xl border border-dashed border-slate-300 py-16 text-center text-sm text-slate-400">
          No hay tutorías que coincidan con estos filtros.
        </div>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full min-w-[720px] text-left text-xs">
            <thead>
              <tr className="border-b border-slate-100 text-slate-400">
                <th className="pb-2 pr-3 font-medium">Estudiante</th>
                <th className="pb-2 pr-3 font-medium">Profesor</th>
                <th className="pb-2 pr-3 font-medium">Ciclo / Módulo</th>
                <th className="pb-2 pr-3 font-medium">Fecha sesión</th>
                <th className="pb-2 font-medium">Estado</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((r) => (
                <tr key={r.id} className="border-b border-slate-50 last:border-0">
                  <td className="py-3 pr-3 font-semibold text-slate-700">{r.studentName}</td>
                  <td className="py-3 pr-3 text-slate-500">{r.profesorName}</td>
                  <td className="py-3 pr-3 text-slate-500">{r.cicloModulo ?? "—"}</td>
                  <td className="py-3 pr-3 text-slate-400">
                    {new Date(r.sessionDate).toLocaleDateString("es-ES")}
                  </td>
                  <td className="py-3">
                    <select
                      defaultValue={r.status}
                      disabled={isPending}
                      onChange={(e) => handleStatusChange(r.id, e.target.value)}
                      className={`rounded-full border-0 px-2.5 py-1 text-[11px] font-semibold outline-none ${TUTORIA_STATUS_COLORS[r.status]}`}
                    >
                      {Object.entries(TUTORIA_STATUS_LABELS).map(([value, label]) => (
                        <option key={value} value={value}>
                          {label}
                        </option>
                      ))}
                    </select>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <div className="mt-4 text-xs text-slate-400">
        Mostrando {filtered.length} de {rows.length} tutorías
      </div>

      {createOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 px-4">
          <div className="w-full max-w-md rounded-2xl bg-white p-6 shadow-xl">
            <div className="mb-5 flex items-center justify-between">
              <h2 className="text-lg font-bold text-[#0B1D4D]">Nueva tutoría</h2>
              <button
                onClick={() => setCreateOpen(false)}
                className="rounded-lg p-1 text-slate-400 hover:bg-slate-100 hover:text-slate-600"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            {createError && (
              <div className="mb-4 rounded-lg bg-red-50 px-3 py-2.5 text-sm text-red-600">
                {createError}
              </div>
            )}

            <form action={handleCreate} className="space-y-4">
              <div>
                <label className="mb-1.5 block text-sm font-semibold text-slate-700">
                  Nombre del alumno
                </label>
                <input
                  name="studentName"
                  required
                  placeholder="Ej. Marcos López"
                  className="w-full rounded-lg border border-slate-200 px-3 py-2.5 text-sm outline-none focus:border-[#2F6FED]"
                />
              </div>

              <div>
                <label className="mb-1.5 block text-sm font-semibold text-slate-700">
                  Ciclo / Módulo (opcional)
                </label>
                <input
                  name="cicloModulo"
                  placeholder="Ej. 1º ESO A"
                  className="w-full rounded-lg border border-slate-200 px-3 py-2.5 text-sm outline-none focus:border-[#2F6FED]"
                />
              </div>

              <div>
                <label className="mb-1.5 block text-sm font-semibold text-slate-700">
                  Fecha y hora
                </label>
                <input
                  name="sessionDate"
                  type="datetime-local"
                  required
                  className="w-full rounded-lg border border-slate-200 px-3 py-2.5 text-sm outline-none focus:border-[#2F6FED]"
                />
              </div>

              {profesores.length > 0 && (
                <div>
                  <label className="mb-1.5 block text-sm font-semibold text-slate-700">
                    Profesor (opcional, por defecto tú)
                  </label>
                  <select
                    name="profesorId"
                    defaultValue=""
                    className="w-full rounded-lg border border-slate-200 px-3 py-2.5 text-sm outline-none focus:border-[#2F6FED]"
                  >
                    <option value="">Yo mismo/a</option>
                    {profesores.map((p) => (
                      <option key={p.id} value={p.id}>
                        {p.name}
                      </option>
                    ))}
                  </select>
                </div>
              )}

              <div className="flex justify-end gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setCreateOpen(false)}
                  className="rounded-lg border border-slate-200 px-4 py-2.5 text-sm font-semibold text-slate-600 hover:bg-slate-50"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={creating}
                  className="rounded-lg bg-[#2F6FED] px-4 py-2.5 text-sm font-semibold text-white hover:bg-[#255ed1] disabled:opacity-60"
                >
                  {creating ? "Creando..." : "Crear tutoría"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
