"use client";

import { useState, useTransition } from "react";
import Link from "next/link";
import { ChevronLeft, ChevronRight, Plus, Trash2, X, Settings } from "lucide-react";
import { createEvento, deleteEvento } from "./actions";
import { deleteTutoriaAlumno } from "../tutorias/alumnoActions";
import { NowIndicator } from "../components/NowIndicator";

type Item = {
  id: string;
  title: string;
  subtitle: string;
  start: number; // minutos desde hourStart
  duration: number; // minutos
  color: string;
  tipo: "horario" | "tutoria" | "guardia" | "evento";
  editable: boolean;
  realId: string;
};

type DiaData = {
  dateIso: string;
  label: string;
  isToday: boolean;
  items: Item[];
};

const ROW_HEIGHT = 56; // px por hora
const COLORES = [
  "#2F6FED", "#8B5CF6", "#22C55E", "#F59E0B", "#EF4444", "#0EA5E9",
  "#EC4899", "#14B8A6", "#F97316", "#A855F7", "#84CC16", "#06B6D4",
  "#D946EF", "#F43F5E", "#64748B",
];

export function CalendarioClient({
  dias,
  weekRangeLabel,
  offset,
  hourStart,
  hourEnd,
}: {
  dias: DiaData[];
  weekRangeLabel: string;
  offset: number;
  hourStart: number;
  hourEnd: number;
}) {
  const [open, setOpen] = useState(false);
  const [defaultDate, setDefaultDate] = useState<string>(dias[0]?.dateIso ?? "");
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();
  const [deletingId, setDeletingId] = useState<string | null>(null);

  const hours = Array.from({ length: hourEnd - hourStart + 1 }, (_, i) => hourStart + i);
  const gridHeight = (hourEnd - hourStart) * ROW_HEIGHT;

  function openModal(dateIso: string) {
    setDefaultDate(dateIso);
    setError(null);
    setOpen(true);
  }

  async function handleSubmit(formData: FormData) {
    setError(null);
    startTransition(async () => {
      try {
        await createEvento(formData);
        setOpen(false);
      } catch (e) {
        setError(e instanceof Error ? e.message : "No se pudo programar el evento.");
      }
    });
  }

  function handleDelete(realId: string, tipo: "evento" | "tutoria") {
    const mensaje =
      tipo === "tutoria"
        ? "¿Eliminar esta tutoría? No se puede deshacer."
        : "¿Eliminar este evento?";
    if (!confirm(mensaje)) return;
    setDeletingId(realId);
    startTransition(async () => {
      try {
        if (tipo === "tutoria") {
          await deleteTutoriaAlumno(realId);
        } else {
          await deleteEvento(realId);
        }
      } catch (e) {
        alert(e instanceof Error ? e.message : "No se pudo eliminar.");
      } finally {
        setDeletingId(null);
      }
    });
  }

  return (
    <div>
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <Link
            href={`/dashboard/calendario?offset=${offset - 1}`}
            className="rounded-lg border border-slate-200 p-2 text-slate-500 hover:bg-slate-50"
          >
            <ChevronLeft className="h-4 w-4" />
          </Link>
          <span className="min-w-[180px] text-center text-sm font-semibold text-slate-600">
            {weekRangeLabel}
          </span>
          <Link
            href={`/dashboard/calendario?offset=${offset + 1}`}
            className="rounded-lg border border-slate-200 p-2 text-slate-500 hover:bg-slate-50"
          >
            <ChevronRight className="h-4 w-4" />
          </Link>
          {offset !== 0 && (
            <Link
              href="/dashboard/calendario"
              className="ml-1 rounded-lg border border-slate-200 px-3 py-2 text-xs font-semibold text-[#2F6FED] hover:bg-blue-50"
            >
              Hoy
            </Link>
          )}
        </div>

        <button
          onClick={() => openModal(dias.find((d) => d.isToday)?.dateIso ?? dias[0].dateIso)}
          className="inline-flex items-center gap-2 rounded-lg bg-[#2F6FED] px-4 py-2.5 text-sm font-semibold text-white hover:bg-[#255ed1]"
        >
          <Plus className="h-4 w-4" /> Programar
        </button>
      </div>

      <div className="overflow-x-auto rounded-2xl border border-slate-200 bg-white">
        <div className="grid min-w-[760px] grid-cols-[64px_repeat(5,1fr)]">
          {/* Cabecera de días */}
          <div className="border-b border-r border-slate-100" />
          {dias.map((dia) => (
            <div
              key={dia.dateIso}
              className={`flex items-center justify-between border-b border-r border-slate-100 px-3 py-2.5 last:border-r-0 ${
                dia.isToday ? "bg-blue-50/50" : ""
              }`}
            >
              <span
                className={`text-xs font-bold capitalize ${
                  dia.isToday ? "text-[#2F6FED]" : "text-[#0B1D4D]"
                }`}
              >
                {dia.label}
              </span>
              {dia.isToday && (
                <span className="rounded-full bg-[#2F6FED] px-2 py-0.5 text-[10px] font-semibold text-white">
                  Hoy
                </span>
              )}
            </div>
          ))}

          {/* Columna de horas */}
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

          {/* Columnas de cada día con sus bloques */}
          {dias.map((dia) => (
            <div
              key={dia.dateIso}
              className="group relative border-r border-slate-100 last:border-r-0"
              style={{ height: gridHeight }}
            >
              {/* Líneas de hora */}
              {hours.map((h, i) => (
                <div
                  key={h}
                  className="absolute w-full border-t border-slate-100"
                  style={{ top: i * ROW_HEIGHT }}
                />
              ))}

              {dia.isToday && (
                <NowIndicator hourStart={hourStart} hourEnd={hourEnd} rowHeight={ROW_HEIGHT} />
              )}

              {/* Botón flotante para programar en este día */}
              <button
                onClick={() => openModal(dia.dateIso)}
                className="absolute right-1 top-1 z-10 rounded p-1 text-slate-300 opacity-0 hover:bg-slate-100 hover:text-[#2F6FED] group-hover:opacity-100"
                title="Programar en este día"
              >
                <Plus className="h-3.5 w-3.5" />
              </button>

              {dia.items.map((item) => {
                const top = Math.max(0, (item.start / 60) * ROW_HEIGHT);
                const height = Math.max(22, (item.duration / 60) * ROW_HEIGHT - 2);
                return (
                  <div
                    key={item.id}
                    className="group/item absolute left-0.5 right-0.5 overflow-hidden rounded-md border-l-4 px-1.5 py-1 text-left"
                    style={{
                      top,
                      height,
                      backgroundColor: `${item.color}1A`,
                      borderColor: item.color,
                    }}
                  >
                    <div className="truncate text-[11px] font-semibold" style={{ color: item.color }}>
                      {item.title}
                    </div>
                    {item.subtitle && (
                      <div className="truncate text-[10px] text-slate-500">{item.subtitle}</div>
                    )}
                    {item.editable && (
                      <button
                        onClick={() => handleDelete(item.realId, item.tipo === "tutoria" ? "tutoria" : "evento")}
                        disabled={pending && deletingId === item.realId}
                        className="absolute right-0.5 top-0.5 rounded p-0.5 text-slate-400 opacity-0 hover:bg-white hover:text-red-500 group-hover/item:opacity-100"
                      >
                        <Trash2 className="h-2.5 w-2.5" />
                      </button>
                    )}
                  </div>
                );
              })}
            </div>
          ))}
        </div>
      </div>

      <div className="mt-3 flex flex-wrap items-center justify-between gap-3 text-xs text-slate-500">
        <div className="flex flex-wrap items-center gap-4">
          <span className="flex items-center gap-1.5">
            <span className="h-2.5 w-2.5 rounded-full" style={{ backgroundColor: "#2F6FED" }} />
            Horario semanal
          </span>
          <span className="flex items-center gap-1.5">
            <span className="h-2.5 w-2.5 rounded-full" style={{ backgroundColor: "#F59E0B" }} />
            Tutorías
          </span>
          <span className="flex items-center gap-1.5">
            <span className="h-2.5 w-2.5 rounded-full" style={{ backgroundColor: "#8B5CF6" }} />
            Guardias
          </span>
          <span className="flex items-center gap-1.5">
            <span className="h-2.5 w-2.5 rounded-full bg-slate-400" />
            Mis eventos
          </span>
        </div>
        <Link
          href="/dashboard/horario"
          className="inline-flex items-center gap-1 font-semibold text-[#2F6FED] hover:underline"
        >
          <Settings className="h-3.5 w-3.5" /> Configurar mi horario
        </Link>
      </div>

      {open && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 px-4">
          <div className="w-full max-w-md rounded-2xl bg-white p-6 shadow-xl">
            <div className="mb-5 flex items-center justify-between">
              <h2 className="text-lg font-bold text-[#0B1D4D]">Programar evento</h2>
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
                <label className="mb-1.5 block text-sm font-semibold text-slate-700">Título</label>
                <input
                  name="title"
                  required
                  placeholder="Ej. Reunión de departamento"
                  className="w-full rounded-lg border border-slate-200 px-3 py-2.5 text-sm outline-none focus:border-[#2F6FED]"
                />
              </div>

              <div>
                <label className="mb-1.5 block text-sm font-semibold text-slate-700">Fecha</label>
                <input
                  name="fecha"
                  type="date"
                  required
                  defaultValue={defaultDate}
                  className="w-full rounded-lg border border-slate-200 px-3 py-2.5 text-sm outline-none focus:border-[#2F6FED]"
                />
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
                    defaultValue="09:00"
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
                    defaultValue="10:00"
                    className="w-full rounded-lg border border-slate-200 px-3 py-2.5 text-sm outline-none focus:border-[#2F6FED]"
                  />
                </div>
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
                  {pending ? "Programando..." : "Programar"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
