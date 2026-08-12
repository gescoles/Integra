"use client";

import { useState } from "react";
import { Plus, Trash2, X, Pencil } from "lucide-react";
import { addHorarioBloque, updateHorarioBloque, deleteHorarioBloque, moverHorarioBloque } from "./actions";
import { NowIndicator } from "../components/NowIndicator";
import { useLocale, useGuardadoTransition } from "../SchoolContext";
import { translate } from "../i18n";

type Bloque = {
  id: string;
  diaSemana: number;
  horaInicio: string;
  horaFin: string;
  asignatura: string;
  grupo: string | null;
  aula: string | null;
  color: string;
  esGuardia: boolean;
};

const DIA_VALUES = [1, 2, 3, 4, 5, 6, 7];

const COLORES = [
  "#FD5249", "#8B5CF6", "#22C55E", "#F59E0B", "#EF4444", "#0EA5E9",
  "#EC4899", "#14B8A6", "#F97316", "#A855F7", "#84CC16", "#06B6D4",
  "#D946EF", "#F43F5E", "#64748B",
];

const HOUR_START = 8;
const HOUR_END = 20;
const ROW_HEIGHT = 56;

function minutesFromHourStart(hhmm: string) {
  const [h, m] = hhmm.split(":").map(Number);
  return (h - HOUR_START) * 60 + m;
}

const HOY_DIA_SEMANA = (() => {
  const d = new Date().getDay(); // 0=domingo
  return d === 0 ? 7 : d;
})();

export function HorarioClient({ bloques, readOnly = false }: { bloques: Bloque[]; readOnly?: boolean }) {
  const { locale } = useLocale();
  const DIAS = DIA_VALUES.map((value) => ({ value, label: translate(locale, `dia.${value}` as never) }));
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<Bloque | null>(null);
  const [defaultDia, setDefaultDia] = useState(1);
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useGuardadoTransition();
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [esGuardiaForm, setEsGuardiaForm] = useState(false);
  const [presetHoras, setPresetHoras] = useState<{ inicio: string; fin: string } | null>(null);
  const [arrastrando, setArrastrando] = useState<{ dia: number; inicio: number; actual: number } | null>(null);
  const [moviendo, setMoviendo] = useState<{
    bloque: Bloque;
    diaOrigen: number;
    offsetMinutos: number; // dónde dentro del bloque se agarró, para no "saltar" al soltar
    diaActual: number;
    inicioMinutosActual: number;
  } | null>(null);
  const [guardandoMovimiento, setGuardandoMovimiento] = useState(false);

  function minutosAHora(mins: number) {
    const totalMin = HOUR_START * 60 + Math.round(mins / 5) * 5;
    const h = Math.floor(totalMin / 60);
    const m = totalMin % 60;
    return `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}`;
  }

  const hours = Array.from({ length: HOUR_END - HOUR_START + 1 }, (_, i) => HOUR_START + i);
  const gridHeight = (HOUR_END - HOUR_START) * ROW_HEIGHT;

  function openCreate(dia: number, horas?: { inicio: string; fin: string }) {
    setEditing(null);
    setDefaultDia(dia);
    setError(null);
    setEsGuardiaForm(false);
    setPresetHoras(horas ?? null);
    setOpen(true);
  }

  function openEdit(b: Bloque) {
    setEditing(b);
    setError(null);
    setEsGuardiaForm(b.esGuardia);
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
    if (!confirm(translate(locale, "horario.confirmEliminarBloque"))) return;
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
      {guardandoMovimiento && (
        <div className="mb-3 rounded-lg bg-slate-50 px-3 py-2 text-xs text-slate-500">
          {translate(locale, "horario.guardandoMovimiento")}
        </div>
      )}
      {!readOnly && (
        <div className="mb-4 flex justify-end">
          <button
            onClick={() => openCreate(1)}
            className="inline-flex items-center gap-2 rounded-lg bg-[#FD5249] px-4 py-2.5 text-sm font-semibold text-white hover:bg-[#D7463E]"
          >
            <Plus className="h-4 w-4" /> {translate(locale, "calendario.programar")}
          </button>
        </div>
      )}

      <div className="overflow-x-auto rounded-2xl border border-slate-200 bg-white">
        <div className="grid min-w-[700px] grid-cols-[52px_repeat(7,minmax(0,1fr))]">
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
                  dia.value === HOY_DIA_SEMANA ? "text-[#FD5249]" : "text-[#0B1D4D]"
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
                className={`group relative border-r border-slate-100 last:border-r-0 ${!readOnly ? "cursor-pointer select-none" : ""}`}
                style={{ height: gridHeight }}
                onMouseDown={(e) => {
                  if (readOnly || (e.target as HTMLElement).closest("button")) return;
                  const rect = e.currentTarget.getBoundingClientRect();
                  const slot = Math.min(Math.max(Math.floor((e.clientY - rect.top) / ROW_HEIGHT), 0), hours.length - 2);
                  setArrastrando({ dia: dia.value, inicio: slot, actual: slot });
                }}
                onMouseMove={(e) => {
                  const rect = e.currentTarget.getBoundingClientRect();
                  if (moviendo && moviendo.diaOrigen === dia.value) {
                    const yMin = ((e.clientY - rect.top) / ROW_HEIGHT) * 60 - moviendo.offsetMinutos;
                    const duracion = minutesFromHourStart(moviendo.bloque.horaFin) - minutesFromHourStart(moviendo.bloque.horaInicio);
                    const maxInicio = (HOUR_END - HOUR_START) * 60 - duracion;
                    const inicioClamp = Math.min(Math.max(yMin, 0), maxInicio);
                    setMoviendo((prev) => (prev ? { ...prev, inicioMinutosActual: inicioClamp } : prev));
                    return;
                  }
                  if (!arrastrando || arrastrando.dia !== dia.value) return;
                  const slot = Math.min(Math.max(Math.floor((e.clientY - rect.top) / ROW_HEIGHT), 0), hours.length - 2);
                  setArrastrando((prev) => (prev ? { ...prev, actual: slot } : prev));
                }}
                onMouseUp={async () => {
                  if (moviendo && moviendo.diaOrigen === dia.value) {
                    const duracion = minutesFromHourStart(moviendo.bloque.horaFin) - minutesFromHourStart(moviendo.bloque.horaInicio);
                    const nuevoInicio = minutosAHora(moviendo.inicioMinutosActual);
                    const nuevoFin = minutosAHora(moviendo.inicioMinutosActual + duracion);
                    const bloqueId = moviendo.bloque.id;
                    setMoviendo(null);
                    if (nuevoInicio === moviendo.bloque.horaInicio) return; // no se movió, no hace falta guardar
                    setGuardandoMovimiento(true);
                    try {
                      await moverHorarioBloque(bloqueId, dia.value, nuevoInicio, nuevoFin);
                    } catch (e) {
                      setError(e instanceof Error ? e.message : "No se pudo mover el bloque.");
                    } finally {
                      setGuardandoMovimiento(false);
                    }
                    return;
                  }
                  if (!arrastrando || arrastrando.dia !== dia.value) return;
                  const desde = Math.min(arrastrando.inicio, arrastrando.actual);
                  const hasta = Math.max(arrastrando.inicio, arrastrando.actual) + 1;
                  const inicio = `${String(HOUR_START + desde).padStart(2, "0")}:00`;
                  const fin = `${String(HOUR_START + hasta).padStart(2, "0")}:00`;
                  setArrastrando(null);
                  openCreate(dia.value, { inicio, fin });
                }}
                onMouseLeave={() => {
                  if (arrastrando?.dia === dia.value) setArrastrando(null);
                }}
              >
                {hours.map((h, i) => (
                  <div
                    key={h}
                    className="pointer-events-none absolute w-full border-t border-slate-100"
                    style={{ top: i * ROW_HEIGHT }}
                  />
                ))}

                {dia.value === HOY_DIA_SEMANA && (
                  <NowIndicator hourStart={HOUR_START} hourEnd={HOUR_END} rowHeight={ROW_HEIGHT} />
                )}

                {arrastrando?.dia === dia.value && (
                  <div
                    className="pointer-events-none absolute left-1 right-1 rounded-lg border-2 border-dashed border-[#FD5249] bg-[#FD5249]/15"
                    style={{
                      top: Math.min(arrastrando.inicio, arrastrando.actual) * ROW_HEIGHT,
                      height: (Math.abs(arrastrando.actual - arrastrando.inicio) + 1) * ROW_HEIGHT,
                    }}
                  />
                )}

                {moviendo?.diaOrigen === dia.value && (
                  <div
                    className="pointer-events-none absolute left-0.5 right-0.5 rounded-md border-l-4 px-1.5 py-1 text-left shadow-lg"
                    style={{
                      top: (moviendo.inicioMinutosActual / 60) * ROW_HEIGHT,
                      height: Math.max(22, ((minutesFromHourStart(moviendo.bloque.horaFin) - minutesFromHourStart(moviendo.bloque.horaInicio)) / 60) * ROW_HEIGHT - 2),
                      backgroundColor: `${moviendo.bloque.color}33`,
                      borderColor: moviendo.bloque.color,
                    }}
                  >
                    <div className="truncate text-[11px] font-semibold" style={{ color: moviendo.bloque.color }}>
                      {minutosAHora(moviendo.inicioMinutosActual)} {moviendo.bloque.esGuardia ? translate(locale, "horario.guardiaCorta") : moviendo.bloque.asignatura}
                    </div>
                  </div>
                )}

                {!readOnly && (
                  <button
                    onClick={() => openCreate(dia.value)}
                    className="absolute right-1 top-1 z-10 rounded p-1 text-slate-300 opacity-0 hover:bg-slate-100 hover:text-[#FD5249] group-hover:opacity-100"
                    title={translate(locale, "calendario.programarEnEsteDia")}
                  >
                    <Plus className="h-3.5 w-3.5" />
                  </button>
                )}

                {bloquesDia.map((b) => {
                  const top = minutesFromHourStart(b.horaInicio) / 60 * ROW_HEIGHT;
                  const height = Math.max(
                    22,
                    (minutesFromHourStart(b.horaFin) - minutesFromHourStart(b.horaInicio)) / 60 * ROW_HEIGHT - 2
                  );
                  return (
                    <button
                      key={b.id}
                      onClick={() => !readOnly && !moviendo && openEdit(b)}
                      onMouseDown={(e) => {
                        if (readOnly) return;
                        e.stopPropagation();
                        const columnaRect = (e.currentTarget.parentElement as HTMLElement).getBoundingClientRect();
                        const yMinDentroColumna = ((e.clientY - columnaRect.top) / ROW_HEIGHT) * 60;
                        const offsetMinutos = yMinDentroColumna - minutesFromHourStart(b.horaInicio);
                        setMoviendo({
                          bloque: b,
                          diaOrigen: dia.value,
                          offsetMinutos,
                          diaActual: dia.value,
                          inicioMinutosActual: minutesFromHourStart(b.horaInicio),
                        });
                      }}
                      disabled={readOnly}
                      className={`group/item absolute left-0.5 right-0.5 overflow-hidden rounded-md border-l-4 px-1.5 py-1 text-left ${readOnly ? "cursor-default" : "cursor-grab active:cursor-grabbing"} ${moviendo?.bloque.id === b.id ? "opacity-30" : ""}`}
                      style={{ top, height, backgroundColor: `${b.color}1A`, borderColor: b.color }}
                    >
                      <div className="flex items-center gap-1 truncate text-[11px] font-semibold" style={{ color: b.color }}>
                        {b.horaInicio} {b.esGuardia ? translate(locale, "horario.guardiaCorta") : b.asignatura}
                        {!readOnly && (
                          <Pencil className="h-2.5 w-2.5 opacity-0 group-hover/item:opacity-100" />
                        )}
                      </div>
                      {(b.grupo || b.aula) && (
                        <div className="truncate text-[10px] text-slate-500">
                          {[b.grupo, b.aula].filter(Boolean).join(" · ")}
                        </div>
                      )}
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
          <div className="max-h-[90vh] w-full max-w-md overflow-y-auto rounded-2xl bg-white p-6 shadow-xl">
            <div className="mb-5 flex items-center justify-between">
              <h2 className="text-lg font-bold text-[#0B1D4D]">
                {editing ? translate(locale, "horario.editarBloque") : translate(locale, "horario.programarBloqueHorario")}
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
                <label className="mb-1.5 block text-sm font-semibold text-slate-700">{translate(locale, "horario.dia")}</label>
                <select
                  name="diaSemana"
                  defaultValue={editing?.diaSemana ?? defaultDia}
                  className="w-full rounded-lg border border-slate-200 px-3 py-2.5 text-sm outline-none focus:border-[#FD5249]"
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
                    {translate(locale, "calendario.horaInicio")}
                  </label>
                  <input
                    name="horaInicio"
                    type="time"
                    required
                    defaultValue={editing?.horaInicio ?? presetHoras?.inicio ?? "08:00"}
                    className="w-full rounded-lg border border-slate-200 px-3 py-2.5 text-sm outline-none focus:border-[#FD5249]"
                  />
                </div>
                <div>
                  <label className="mb-1.5 block text-sm font-semibold text-slate-700">
                    {translate(locale, "calendario.horaFin")}
                  </label>
                  <input
                    name="horaFin"
                    type="time"
                    required
                    defaultValue={editing?.horaFin ?? presetHoras?.fin ?? "08:55"}
                    className="w-full rounded-lg border border-slate-200 px-3 py-2.5 text-sm outline-none focus:border-[#FD5249]"
                  />
                </div>
              </div>

              <label className="flex cursor-pointer items-center gap-2.5 rounded-lg border border-slate-200 px-3 py-2.5">
                <input
                  type="checkbox"
                  name="esGuardia"
                  value="true"
                  checked={esGuardiaForm}
                  onChange={(e) => setEsGuardiaForm(e.target.checked)}
                  className="h-4 w-4 accent-[#FD5249]"
                />
                <span className="text-sm font-semibold text-slate-700">{translate(locale, "horario.esGuardia")}</span>
              </label>
              <p className="-mt-2 text-[11px] text-slate-400">{translate(locale, "horario.esGuardiaAyuda")}</p>

              <div>
                <label className="mb-1.5 block text-sm font-semibold text-slate-700">
                  {translate(locale, "horario.asignatura")}
                </label>
                <input
                  name="asignatura"
                  required={!esGuardiaForm}
                  defaultValue={editing?.asignatura ?? (esGuardiaForm ? translate(locale, "horario.guardiaCorta") : "")}
                  placeholder={translate(locale, "horario.asignaturaPlaceholder")}
                  className="w-full rounded-lg border border-slate-200 px-3 py-2.5 text-sm outline-none focus:border-[#FD5249]"
                />
              </div>

              <div>
                <label className="mb-1.5 block text-sm font-semibold text-slate-700">{translate(locale, "horario.grupo")}</label>
                <input
                  name="grupo"
                  required={!esGuardiaForm}
                  defaultValue={editing?.grupo ?? ""}
                  placeholder={translate(locale, "horario.grupoPlaceholder")}
                  className="w-full rounded-lg border border-slate-200 px-3 py-2.5 text-sm outline-none focus:border-[#FD5249]"
                />
              </div>

              <div>
                <label className="mb-1.5 block text-sm font-semibold text-slate-700">{translate(locale, "horario.aula")}</label>
                <input
                  name="aula"
                  required={!esGuardiaForm}
                  defaultValue={editing?.aula ?? ""}
                  placeholder={translate(locale, "horario.aulaPlaceholder")}
                  className="w-full rounded-lg border border-slate-200 px-3 py-2.5 text-sm outline-none focus:border-[#FD5249]"
                />
                <p className="mt-1 text-[11px] text-slate-400">{translate(locale, "horario.aulaAyuda")}</p>
              </div>

              <div>
                <label className="mb-2 block text-sm font-semibold text-slate-700">{translate(locale, "calendario.color")}</label>
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
                    <Trash2 className="h-4 w-4" /> {translate(locale, "common.eliminar")}
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
                    {translate(locale, "common.cancelar")}
                  </button>
                  <button
                    type="submit"
                    disabled={pending}
                    className="rounded-lg bg-[#FD5249] px-4 py-2.5 text-sm font-semibold text-white hover:bg-[#D7463E] disabled:opacity-60"
                  >
                    {pending
                      ? translate(locale, "common.guardando")
                      : editing
                      ? translate(locale, "tutorias.guardarCambios")
                      : translate(locale, "calendario.programar")}
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
