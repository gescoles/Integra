"use client";

import { useMemo, useState } from "react";
import { Filter } from "lucide-react";

type AgendaItem = {
  id: string;
  time: string; // ISO
  title: string;
  subtitle: string;
  profesorId: string;
  profesorName: string;
  color: string;
};

type ProfesorOption = { id: string; name: string };

export function CoordinadorAgenda({
  items,
  profesores,
}: {
  items: AgendaItem[];
  profesores: ProfesorOption[];
}) {
  const [profesorFilter, setProfesorFilter] = useState("Todos");

  const filtered = useMemo(() => {
    if (profesorFilter === "Todos") return items;
    return items.filter((i) => i.profesorId === profesorFilter);
  }, [items, profesorFilter]);

  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-5">
      <div className="mb-4 flex items-center justify-between">
        <h3 className="text-sm font-bold text-[#0B1D4D]">Agenda de hoy — todo el centro</h3>
        <div className="flex items-center gap-2">
          <Filter className="h-3.5 w-3.5 text-slate-400" />
          <select
            value={profesorFilter}
            onChange={(e) => setProfesorFilter(e.target.value)}
            className="rounded-lg border border-slate-200 px-2 py-1.5 text-xs outline-none focus:border-[#2F6FED]"
          >
            <option value="Todos">Todos los profesores</option>
            {profesores.map((p) => (
              <option key={p.id} value={p.id}>
                {p.name}
              </option>
            ))}
          </select>
        </div>
      </div>

      {filtered.length === 0 ? (
        <p className="text-sm text-slate-400">
          No hay tutorías ni guardias programadas para hoy con este filtro.
        </p>
      ) : (
        <div className="space-y-4">
          {filtered.map((a) => (
            <div key={a.id} className="flex items-start gap-3">
              <span className={`mt-1.5 h-2 w-2 shrink-0 rounded-full ${a.color}`} />
              <div className="flex-1">
                <div className="text-sm font-semibold text-slate-700">{a.title}</div>
                <div className="text-xs text-slate-500">
                  {a.profesorName}
                  {a.subtitle ? ` · ${a.subtitle}` : ""}
                </div>
              </div>
              <div className="shrink-0 text-xs font-medium text-slate-400">
                {new Date(a.time).toLocaleTimeString("es-ES", { hour: "2-digit", minute: "2-digit" })}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
