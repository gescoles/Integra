"use client";

import { useMemo, useState, useTransition } from "react";
import { Search } from "lucide-react";
import { updateMaterialStatus } from "./actions";
import {
  MATERIAL_STATUS_LABELS,
  MATERIAL_STATUS_COLORS,
  MATERIAL_PRIORITY_LABELS,
  MATERIAL_PRIORITY_COLORS,
} from "../constants";

type Row = {
  id: string;
  materialName: string;
  cicloModulo: string;
  cantidad: number;
  prioridad: string;
  costeEstimado: number;
  status: string;
  profesorId: string;
  profesorName: string;
};

type ProfesorOption = { id: string; name: string };

export function MaterialClient({
  rows,
  profesores,
}: {
  rows: Row[];
  profesores: ProfesorOption[];
}) {
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("Todos");
  const [prioridadFilter, setPrioridadFilter] = useState("Todos");
  const [profesorFilter, setProfesorFilter] = useState("Todos");
  const [isPending, startTransition] = useTransition();

  const filtered = useMemo(() => {
    const q = search.toLowerCase();
    return rows.filter((r) => {
      if (
        q &&
        !r.materialName.toLowerCase().includes(q) &&
        !r.cicloModulo.toLowerCase().includes(q)
      )
        return false;
      if (statusFilter !== "Todos" && r.status !== statusFilter) return false;
      if (prioridadFilter !== "Todos" && r.prioridad !== prioridadFilter) return false;
      if (profesorFilter !== "Todos" && r.profesorId !== profesorFilter) return false;
      return true;
    });
  }, [rows, search, statusFilter, prioridadFilter, profesorFilter]);

  const totalCoste = filtered.reduce((sum, r) => sum + r.costeEstimado, 0);

  function handleStatusChange(id: string, status: string) {
    startTransition(() => {
      updateMaterialStatus(id, status as never);
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
            placeholder="Buscar por material o ciclo/módulo..."
            className="w-full rounded-lg border border-slate-200 py-2 pl-9 pr-3 text-sm outline-none focus:border-[#2F6FED]"
          />
        </div>
        <select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
          className="rounded-lg border border-slate-200 px-3 py-2 text-sm outline-none focus:border-[#2F6FED]"
        >
          <option value="Todos">Todos los estados</option>
          {Object.entries(MATERIAL_STATUS_LABELS).map(([value, label]) => (
            <option key={value} value={value}>
              {label}
            </option>
          ))}
        </select>
        <select
          value={prioridadFilter}
          onChange={(e) => setPrioridadFilter(e.target.value)}
          className="rounded-lg border border-slate-200 px-3 py-2 text-sm outline-none focus:border-[#2F6FED]"
        >
          <option value="Todos">Toda prioridad</option>
          {Object.entries(MATERIAL_PRIORITY_LABELS).map(([value, label]) => (
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

      {filtered.length === 0 ? (
        <div className="rounded-xl border border-dashed border-slate-300 py-16 text-center text-sm text-slate-400">
          No hay solicitudes de material que coincidan con estos filtros.
        </div>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full min-w-[820px] text-left text-xs">
            <thead>
              <tr className="border-b border-slate-100 text-slate-400">
                <th className="pb-2 pr-3 font-medium">Ciclo / Módulo</th>
                <th className="pb-2 pr-3 font-medium">Material solicitado</th>
                <th className="pb-2 pr-3 font-medium">Cantidad</th>
                <th className="pb-2 pr-3 font-medium">Prioridad</th>
                <th className="pb-2 pr-3 font-medium">Coste estimado</th>
                <th className="pb-2 pr-3 font-medium">Solicitado por</th>
                <th className="pb-2 font-medium">Estado</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((r) => (
                <tr key={r.id} className="border-b border-slate-50 last:border-0">
                  <td className="py-3 pr-3 text-slate-500">{r.cicloModulo}</td>
                  <td className="py-3 pr-3 font-semibold text-slate-700">{r.materialName}</td>
                  <td className="py-3 pr-3 text-slate-500">{r.cantidad}</td>
                  <td className="py-3 pr-3">
                    <span
                      className={`rounded-full px-2.5 py-1 text-[11px] font-semibold ${MATERIAL_PRIORITY_COLORS[r.prioridad]}`}
                    >
                      {MATERIAL_PRIORITY_LABELS[r.prioridad]}
                    </span>
                  </td>
                  <td className="py-3 pr-3 text-slate-500">
                    {r.costeEstimado.toLocaleString("es-ES", { style: "currency", currency: "EUR" })}
                  </td>
                  <td className="py-3 pr-3 text-slate-500">{r.profesorName}</td>
                  <td className="py-3">
                    <select
                      defaultValue={r.status}
                      disabled={isPending}
                      onChange={(e) => handleStatusChange(r.id, e.target.value)}
                      className={`rounded-full border-0 px-2.5 py-1 text-[11px] font-semibold outline-none ${MATERIAL_STATUS_COLORS[r.status]}`}
                    >
                      {Object.entries(MATERIAL_STATUS_LABELS).map(([value, label]) => (
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

      <div className="mt-4 flex items-center justify-between text-xs text-slate-400">
        <span>
          Mostrando {filtered.length} de {rows.length} solicitudes
        </span>
        <span className="font-semibold text-slate-600">
          Coste total filtrado:{" "}
          {totalCoste.toLocaleString("es-ES", { style: "currency", currency: "EUR" })}
        </span>
      </div>
    </div>
  );
}
