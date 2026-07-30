"use client";

import { useState, useTransition } from "react";
import { Plus, Trash2, X, Clock } from "lucide-react";
import { addHorarioBloque, deleteHorarioBloque } from "./actions";

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

const COLORES = ["#2F6FED", "#8B5CF6", "#22C55E", "#F59E0B", "#EF4444", "#0EA5E9"];

export function HorarioClient({ bloques }: { bloques: Bloque[] }) {
  const [open, setOpen] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();
  const [deletingId, setDeletingId] = useState<string | null>(null);

  async function handleSubmit(formData: FormData) {
    setError(null);
    startTransition(async () => {
      try {
        await addHorarioBloque(formData);
        setOpen(false);
      } catch (e) {
        setError(e instanceof Error ? e.message : "No se pudo añadir el bloque.");
      }
    });
  }

  function handleDelete(id: string) {
    if (!confirm("¿Eliminar este bloque del horario?")) return;
    setDeletingId(id);
    startTransition(async () => {
      try {
        await deleteHorarioBloque(id);
      } finally {
        setDeletingId(null);
      }
    });
  }

  return (
    <div>
      <div className="mb-4 flex justify-end">
        <button
          onClick={() => setOpen(true)}
          className="inline-flex items-center gap-2 rounded-lg bg-[#2F6FED] px-4 py-2.5 text-sm font-semibold text-white hover:bg-[#255ed1]"
        >
          <Plus className="h-4 w-4" /> Añadir bloque
        </button>
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-5">
        {DIAS.map((dia) => {
          const bloquesDia = bloques
            .filter((b) => b.diaSemana === dia.value)
            .sort((a, b) => a.horaInicio.localeCompare(b.horaInicio));

          return (
            <div key={dia.value} className="rounded-2xl border border-slate-200 bg-white p-4">
              <h3 className="mb-3 text-sm font-bold text-[#0B1D4D]">{dia.label}</h3>
              {bloquesDia.length === 0 ? (
                <p className="text-xs text-slate-300">Sin clases</p>
              ) : (
                <div className="space-y-2">
                  {bloquesDia.map((b) => (
                    <div
                      key={b.id}
                      className="group relative rounded-lg border-l-4 bg-slate-50 p-2.5"
                      style={{ borderColor: b.color }}
                    >
                      <div className="flex items-center gap-1 text-[11px] font-medium text-slate-400">
                        <Clock className="h-3 w-3" />
                        {b.horaInicio} – {b.horaFin}
                      </div>
                      <div className="text-sm font-semibold text-slate-700">{b.asignatura}</div>
                      {b.grupo && <div className="text-xs text-slate-500">{b.grupo}</div>}
                      <button
                        onClick={() => handleDelete(b.id)}
                        disabled={pending && deletingId === b.id}
                        className="absolute right-1.5 top-1.5 rounded p-1 text-slate-300 opacity-0 hover:bg-red-50 hover:text-red-500 group-hover:opacity-100"
                        title="Eliminar"
                      >
                        <Trash2 className="h-3 w-3" />
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          );
        })}
      </div>

      {open && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 px-4">
          <div className="w-full max-w-md rounded-2xl bg-white p-6 shadow-xl">
            <div className="mb-5 flex items-center justify-between">
              <h2 className="text-lg font-bold text-[#0B1D4D]">Añadir bloque al horario</h2>
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
                  defaultValue={1}
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
                    defaultValue="08:00"
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
                    defaultValue="08:55"
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
                  placeholder="Ej. Matemáticas"
                  className="w-full rounded-lg border border-slate-200 px-3 py-2.5 text-sm outline-none focus:border-[#2F6FED]"
                />
              </div>

              <div>
                <label className="mb-1.5 block text-sm font-semibold text-slate-700">
                  Grupo (opcional)
                </label>
                <input
                  name="grupo"
                  placeholder="Ej. 1º ESO A"
                  className="w-full rounded-lg border border-slate-200 px-3 py-2.5 text-sm outline-none focus:border-[#2F6FED]"
                />
              </div>

              <div>
                <label className="mb-2 block text-sm font-semibold text-slate-700">Color</label>
                <div className="flex gap-2">
                  {COLORES.map((c) => (
                    <label key={c}>
                      <input
                        type="radio"
                        name="color"
                        value={c}
                        defaultChecked={c === COLORES[0]}
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

              <div className="flex justify-end gap-3 pt-2">
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
                  {pending ? "Añadiendo..." : "Añadir"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
