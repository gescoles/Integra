"use client";

import { useMemo, useState } from "react";
import { Search } from "lucide-react";
import { updateGuardiaStatus } from "./actions";
import { GUARDIA_STATUS_LABELS, GUARDIA_STATUS_COLORS } from "../constants";
import { useLocale, useGuardadoTransition } from "../SchoolContext";
import { translate } from "../i18n";

type Row = {
  id: string;
  turno: string;
  ubicacion: string | null;
  grupo: string | null;
  tarea: string | null;
  status: string;
  fecha: string;
  profesorId: string;
  profesorName: string;
};

type ProfesorOption = { id: string; name: string };

export function GuardiasClient({
  rows,
  profesores,
}: {
  rows: Row[];
  profesores: ProfesorOption[];
}) {
  const { locale } = useLocale();
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("Todos");
  const [profesorFilter, setProfesorFilter] = useState("Todos");
  const [isPending, startTransition] = useGuardadoTransition();

  const filtered = useMemo(() => {
    const q = search.toLowerCase();
    return rows.filter((r) => {
      if (
        q &&
        !r.turno.toLowerCase().includes(q) &&
        !(r.ubicacion ?? "").toLowerCase().includes(q)
      )
        return false;
      if (statusFilter !== "Todos" && r.status !== statusFilter) return false;
      if (profesorFilter !== "Todos" && r.profesorId !== profesorFilter) return false;
      return true;
    });
  }, [rows, search, statusFilter, profesorFilter]);

  function handleStatusChange(id: string, status: string) {
    startTransition(() => {
      updateGuardiaStatus(id, status as never);
    });
  }

  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-5">
      <div className="mb-4 flex flex-wrap gap-3">
        <div className="relative min-w-[220px] flex-1">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder={translate(locale, "guardias.buscarPlaceholder")}
            className="w-full rounded-lg border border-slate-200 py-2 pl-9 pr-3 text-sm outline-none focus:border-[#2F6FED]"
          />
        </div>
        <select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
          className="rounded-lg border border-slate-200 px-3 py-2 text-sm outline-none focus:border-[#2F6FED]"
        >
          <option value="Todos">{translate(locale, "guardias.todosEstados")}</option>
          {Object.keys(GUARDIA_STATUS_LABELS).map((value) => (
            <option key={value} value={value}>
              {translate(locale, `status.${value}` as never)}
            </option>
          ))}
        </select>
        <select
          value={profesorFilter}
          onChange={(e) => setProfesorFilter(e.target.value)}
          className="rounded-lg border border-slate-200 px-3 py-2 text-sm outline-none focus:border-[#2F6FED]"
        >
          <option value="Todos">{translate(locale, "guardias.todosProfesores")}</option>
          {profesores.map((p) => (
            <option key={p.id} value={p.id}>
              {p.name}
            </option>
          ))}
        </select>
      </div>

      {filtered.length === 0 ? (
        <div className="rounded-xl border border-dashed border-slate-300 py-16 text-center text-sm text-slate-400">
          {translate(locale, "guardias.sinResultados")}
        </div>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full min-w-[720px] text-left text-xs">
            <thead>
              <tr className="border-b border-slate-100 text-slate-400">
                <th className="pb-2 pr-3 font-medium">{translate(locale, "guardias.colTurno")}</th>
                <th className="pb-2 pr-3 font-medium">{translate(locale, "guardias.colProfesor")}</th>
                <th className="pb-2 pr-3 font-medium">{translate(locale, "guardias.colGrupo")}</th>
                <th className="pb-2 pr-3 font-medium">{translate(locale, "guardias.colUbicacion")}</th>
                <th className="pb-2 pr-3 font-medium">{translate(locale, "guardias.colFecha")}</th>
                <th className="pb-2 font-medium">{translate(locale, "guardias.colEstado")}</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((r) => (
                <tr key={r.id} className="border-b border-slate-50 last:border-0">
                  <td className="py-3 pr-3 font-semibold text-slate-700" title={r.tarea ?? undefined}>
                    {r.turno}
                    {r.tarea && <div className="mt-0.5 max-w-[220px] truncate text-[10px] font-normal text-slate-400">{r.tarea}</div>}
                  </td>
                  <td className="py-3 pr-3 text-slate-500">{r.profesorName}</td>
                  <td className="py-3 pr-3 text-slate-500">{r.grupo ?? "—"}</td>
                  <td className="py-3 pr-3 text-slate-500">{r.ubicacion ?? "—"}</td>
                  <td className="py-3 pr-3 text-slate-400">
                    {new Date(r.fecha).toLocaleDateString("es-ES")}
                  </td>
                  <td className="py-3">
                    <select
                      defaultValue={r.status}
                      disabled={isPending}
                      onChange={(e) => handleStatusChange(r.id, e.target.value)}
                      className={`rounded-full border-0 px-2.5 py-1 text-[11px] font-semibold outline-none ${GUARDIA_STATUS_COLORS[r.status]}`}
                    >
                      {Object.keys(GUARDIA_STATUS_LABELS).map((value) => (
                        <option key={value} value={value}>
                          {translate(locale, `status.${value}` as never)}
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
        Mostrando {filtered.length} de {rows.length} guardias
      </div>
    </div>
  );
}
