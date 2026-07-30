"use client";

import { useState, useTransition } from "react";
import { Plus, Trash2, X, Pencil } from "lucide-react";
import { addHorarioBloque, updateHorarioBloque, deleteHorarioBloque } from "./actions";
import { NowIndicator } from "../components/NowIndicator";

type Bloque = {
  id: string;
  diaSemana: number;
  horaInicio: string;
  horaFin: string;
  asignatura: string;
  grupo: string | null;
  color: string;
};

const DIAS = [
  { value: 1, label: "Lunes" },
  { value: 2, label: "Martes" },
  { value: 3, label: "Miércoles" },
  { value: 4, label: "Jueves" },
  { value: 5, label: "Viernes" },
];

const COLORES = [
  "#2F6FED", "#8B5CF6", "#22C55E", "#F59E0B", "#EF4444", "#0EA5E9",
  "#EC4899", "#14B8A6", "#F97316", "#A855F7", "#84CC16", "#06B6D4",
  "#D946EF", "#F43F5E", "#64748B",
];

const HOUR_START = 8;
const HOUR_END = 18;
const ROW_HEIGHT = 56;

function minutesFromHourStart(hhmm: string) {
  const [h, m] = hhmm.split(":").map(Number);
  return (h - HOUR_START) * 60 + m;
}

const HOY_DIA_SEMANA = (() => {
  const d = new Date().getDay(); // 0=domingo
  return d === 0 ? 7 : d;
})();

export function HorarioClient({ bloques }: { bloques: Bloque[] }) {
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<Bloque | null>(null);
  const [defaultDia, setDefaultDia] = useState(1);
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();
  const [deletingId, setDeletingId] = useState<string | null>(null);

  const hours = Array.from({ length: HOUR_END - HOUR_START + 1 }, (_, i) => HOUR_START + i);
  const gridHeight = (HOUR_END - HOUR_START) * ROW_HEIGHT;

  function openCreate(dia: number) {
    setEditing(null);
    setDefaultDia(dia);
    setError(null);
    setOpen(true);
  }

  function openEdit(b: Bloque) {
    setEditing(b);
    setError(null);
    setOpen(true);
  }

  async function handleSubmit(formData: FormData) {
    setError(null);
    startTransition(async () => {
      try {
        if (editing) {
          formData.set("id", editing.id);
          await updateHorarioBloque(formData);
        } else {
          await addHorarioBloque(formData);
        }
        setOpen(false);
      } catch (e) {
        setError(e instanceof Error ? e.message : "No se pudo guardar el bloque.");
      }
    });
  }

  function handleDelete(id: string) {
    if (!confirm("¿Eliminar este bloque del horario?")) return;
    setDeletingId(id);
    startTransition(async () => {
      try {
        await deleteHorarioBloque(id);
        setOpen(false);
      } finally {
        setDeletingId(null);
      }
    });
  }

  return (
    <div>
      <div className="mb-4 flex justify-end">
        <button
          onClick={() => openCreate(1)}
          className="inline-flex items-center gap-2 rounded-lg bg-[#2F6FED] px-4 py-2.5 text-sm font-semibold text-white hover:bg-[#255ed1]"
        >
          <Plus className="h-4 w-4" /> Programar
        </button>
      </div>

      <div className="overflow-x-auto rounded-2xl border border-slate-200 bg-white">
        <div className="grid min-w-[760px] grid-cols-[64px_repeat(5,1fr)]">
          <div className="border-b border-r border-slate-100" />
          {DIAS.map((dia) => (
            <div
              key={dia.value}
              className={`border-b border-r border-slate-100 px-3 py-2.5 last:border-r-0 ${
                dia.value === HOY_DIA_SEMANA ? "bg-blue-50/50" : ""
              }`}
            >
              <span
                className={`text-xs font-bold ${
                  dia.value === HOY_DIA_SEMANA ? "text-[#2F6FED]" : "text-[#0B1D4D]"
                }`}
              >
                {dia.label}
              </span>
            </div>
          ))}

          <div className="relative border-r border-slate-100" style={{ height: gridHeight }}>
            {hours.map((h, i) => (
              <div
                key={h}
                className="absolute left-0 w-full pr-2 text-right text-[11px] text-slate-400"
                style={{ top: i * ROW_HEIGHT - 7 }}
              >
                {String(h).padStart(2, "0")}:00
              </div>
            ))}
          </div>

          {DIAS.map((dia) => {
            const bloquesDia = bloques.filter((b) => b.diaSemana === dia.value);
            return (
              <div
                key={dia.value}
                className="group relative border-r border-slate-100 last:border-r-0"
                style={{ height: gridHeight }}
              >
                {hours.map((h, i) => (
                  <div
                    key={h}
                    className="absolute w-full border-t border-slate-100"
                    style={{ top: i * ROW_HEIGHT }}
                  />
                ))}

                {dia.value === HOY_DIA_SEMANA && (
                  <NowIndicator hourStart={HOUR_START} hourEnd={HOUR_END} rowHeight={ROW_HEIGHT} />
                )}

                <button
                  onClick={() => openCreate(dia.value)}
                  className="absolute right-1 top-1 z-10 rounded p-1 text-slate-300 opacity-0 hover:bg-slate-100 hover:text-[#2F6FED] group-hover:opacity-100"
                  title="Programar en este día"
                >
                  <Plus className="h-3.5 w-3.5" />
                </button>

                {bloquesDia.map((b) => {
                  const top = minutesFromHourStart(b.horaInicio) / 60 * ROW_HEIGHT;
                  const height = Math.max(
                    22,
                    (minutesFromHourStart(b.horaFin) - minutesFromHourStart(b.horaInicio)) / 60 * ROW_HEIGHT - 2
                  );
                  return (
                    <button
                      key={b.id}
                      onClick={() => openEdit(b)}
                      className="group/item absolute left-0.5 right-0.5 overflow-hidden rounded-md border-l-4 px-1.5 py-1 text-left"
                      style={{ top, height, backgroundColor: `${b.color}1A`, borderColor: b.color }}
                    >
                      <div className="flex items-center gap-1 truncate text-[11px] font-semibold" style={{ color: b.color }}>
                        {b.horaInicio} {b.asignatura}
                        <Pencil className="h-2.5 w-2.5 opacity-0 group-hover/item:opacity-100" />
                      </div>
                      {b.grupo && <div className="truncate text-[10px] text-slate-500">{b.grupo}</div>}
                    </button>
                  );
                })}
              </div>
            );
          })}
        </div>
      </div>

      {open && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 px-4">
          <div className="w-full max-w-md rounded-2xl bg-white p-6 shadow-xl">
            <div className="mb-5 flex items-center justify-between">
              <h2 className="text-lg font-bold text-[#0B1D4D]">
                {editing ? "Editar bloque" : "Programar bloque de horario"}
              </h2>
              <button
                onClick={() => setOpen(false)}
                className="rounded-lg p-1 text-slate-400 hover:bg-slate-100 hover:text-slate-600"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            {error && (
              <div className="mb-4 rounded-lg bg-red-50 px-3 py-2.5 text-sm text-red-600">
                {error}
              </div>
            )}

            <form action={handleSubmit} className="space-y-4">
              <div>
                <label className="mb-1.5 block text-sm font-semibold text-slate-700">Día</label>
                <select
                  name="diaSemana"
                  defaultValue={editing?.diaSemana ?? defaultDia}
                  className="w-full rounded-lg border border-slate-200 px-3 py-2.5 text-sm outline-none focus:border-[#2F6FED]"
                >
                  {DIAS.map((d) => (
                    <option key={d.value} value={d.value}>
                      {d.label}
                    </option>
                  ))}
                </select>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="mb-1.5 block text-sm font-semibold text-slate-700">
                    Hora inicio
                  </label>
                  <input
                    name="horaInicio"
                    type="time"
                    required
                    defaultValue={editing?.horaInicio ?? "08:00"}
                    className="w-full rounded-lg border border-slate-200 px-3 py-2.5 text-sm outline-none focus:border-[#2F6FED]"
                  />
                </div>
                <div>
                  <label className="mb-1.5 block text-sm font-semibold text-slate-700">
                    Hora fin
                  </label>
                  <input
                    name="horaFin"
                    type="time"
                    required
                    defaultValue={editing?.horaFin ?? "08:55"}
                    className="w-full rounded-lg border border-slate-200 px-3 py-2.5 text-sm outline-none focus:border-[#2F6FED]"
                  />
                </div>
              </div>

              <div>
                <label className="mb-1.5 block text-sm font-semibold text-slate-700">
                  Asignatura
                </label>
                <input
                  name="asignatura"
                  required
                  defaultValue={editing?.asignatura ?? ""}
                  placeholder="Ej. Matemáticas"
                  className="w-full rounded-lg border border-slate-200 px-3 py-2.5 text-sm outline-none focus:border-[#2F6FED]"
                />
              </div>

              <div>
                <label className="mb-1.5 block text-sm font-semibold text-slate-700">Grupo</label>
                <input
                  name="grupo"
                  required
                  defaultValue={editing?.grupo ?? ""}
                  placeholder="Ej. 1º ESO A"
                  className="w-full rounded-lg border border-slate-200 px-3 py-2.5 text-sm outline-none focus:border-[#2F6FED]"
                />
              </div>

              <div>
                <label className="mb-2 block text-sm font-semibold text-slate-700">Color</label>
                <div className="flex flex-wrap gap-2">
                  {COLORES.map((c) => (
                    <label key={c}>
                      <input
                        type="radio"
                        name="color"
                        value={c}
                        defaultChecked={(editing?.color ?? COLORES[0]) === c}
                        className="peer sr-only"
                      />
                      <span
                        className="block h-7 w-7 cursor-pointer rounded-full ring-offset-2 peer-checked:ring-2"
                        style={{ backgroundColor: c, "--tw-ring-color": c } as React.CSSProperties}
                      />
                    </label>
                  ))}
                </div>
              </div>

              <div className="flex items-center justify-between pt-2">
                {editing ? (
                  <button
                    type="button"
                    onClick={() => handleDelete(editing.id)}
                    disabled={pending && deletingId === editing.id}
                    className="inline-flex items-center gap-1.5 rounded-lg border border-red-200 px-3 py-2.5 text-sm font-semibold text-red-600 hover:bg-red-50"
                  >
                    <Trash2 className="h-4 w-4" /> Eliminar
                  </button>
                ) : (
                  <span />
                )}
                <div className="flex gap-3">
                  <button
                    type="button"
                    onClick={() => setOpen(false)}
                    className="rounded-lg border border-slate-200 px-4 py-2.5 text-sm font-semibold text-slate-600 hover:bg-slate-50"
                  >
                    Cancelar
                  </button>
                  <button
                    type="submit"
                    disabled={pending}
                    className="rounded-lg bg-[#2F6FED] px-4 py-2.5 text-sm font-semibold text-white hover:bg-[#255ed1] disabled:opacity-60"
                  >
                    {pending ? "Guardando..." : editing ? "Guardar cambios" : "Programar"}
                  </button>
                </div>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
