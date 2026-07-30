"use client";

import { useState, useTransition } from "react";
import Link from "next/link";
import { ChevronLeft, ChevronRight, Plus, Trash2, X, Clock, GraduationCap } from "lucide-react";
import { createEvento, deleteEvento } from "./actions";

type DiaData = {
  dateIso: string;
  label: string;
  isToday: boolean;
  items: {
    id: string;
    title: string;
    subtitle: string;
    horaInicio: string;
    horaFin: string;
    color: string;
    tipo: "evento" | "tutoria";
  }[];
};

const COLORES = ["#2F6FED", "#8B5CF6", "#22C55E", "#F59E0B", "#EF4444", "#0EA5E9"];

export function CalendarioClient({
  dias,
  weekRangeLabel,
  offset,
}: {
  dias: DiaData[];
  weekRangeLabel: string;
  offset: number;
}) {
  const [open, setOpen] = useState(false);
  const [defaultDate, setDefaultDate] = useState<string>(dias[0]?.dateIso ?? "");
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();
  const [deletingId, setDeletingId] = useState<string | null>(null);

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

  function handleDelete(id: string) {
    if (!confirm("¿Eliminar este evento?")) return;
    setDeletingId(id);
    startTransition(async () => {
      try {
        await deleteEvento(id);
      } finally {
        setDeletingId(null);
      }
    });
  }

  return (
    <div>
      <div className="mb-4 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Link
            href={`/dashboard/calendario?offset=${offset - 1}`}
            className="rounded-lg border border-slate-200 p-2 text-slate-500 hover:bg-slate-50"
          >
            <ChevronLeft className="h-4 w-4" />
          </Link>
          <span className="min-w-[160px] text-center text-sm font-semibold text-slate-600">
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

      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-7">
        {dias.map((dia) => (
          <div
            key={dia.dateIso}
            className={`rounded-2xl border bg-white p-3 ${
              dia.isToday ? "border-[#2F6FED]" : "border-slate-200"
            }`}
          >
            <div className="mb-2 flex items-center justify-between">
              <h3
                className={`text-xs font-bold capitalize ${
                  dia.isToday ? "text-[#2F6FED]" : "text-[#0B1D4D]"
                }`}
              >
                {dia.label}
              </h3>
              <button
                onClick={() => openModal(dia.dateIso)}
                className="rounded p-0.5 text-slate-300 hover:bg-slate-100 hover:text-[#2F6FED]"
                title="Programar en este día"
              >
                <Plus className="h-3.5 w-3.5" />
              </button>
            </div>

            {dia.items.length === 0 ? (
              <p className="text-[11px] text-slate-300">Sin eventos</p>
            ) : (
              <div className="space-y-1.5">
                {dia.items.map((it) => (
                  <div
                    key={it.id}
                    className="group relative rounded-lg border-l-4 bg-slate-50 p-2"
                    style={{ borderColor: it.color }}
                  >
                    <div className="flex items-center gap-1 text-[10px] font-medium text-slate-400">
                      <Clock className="h-2.5 w-2.5" />
                      {it.horaInicio}–{it.horaFin}
                      {it.tipo === "tutoria" && <GraduationCap className="ml-1 h-2.5 w-2.5" />}
                    </div>
                    <div className="text-[12px] font-semibold text-slate-700">{it.title}</div>
                    {it.subtitle && <div className="text-[10px] text-slate-500">{it.subtitle}</div>}
                    {it.tipo === "evento" && (
                      <button
                        onClick={() => handleDelete(it.id)}
                        disabled={pending && deletingId === it.id}
                        className="absolute right-1 top-1 rounded p-0.5 text-slate-300 opacity-0 hover:bg-red-50 hover:text-red-500 group-hover:opacity-100"
                      >
                        <Trash2 className="h-2.5 w-2.5" />
                      </button>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        ))}
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
