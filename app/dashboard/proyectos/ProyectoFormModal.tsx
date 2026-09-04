"use client";

import { useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { Plus, X, Trash2 } from "lucide-react";
import { crearProyecto } from "./actions";
import { ButtonSpinner } from "../components/ButtonSpinner";

type TipoNotaFila = { nombre: string; porcentaje: string };

function filaVacia(): TipoNotaFila {
  return { nombre: "", porcentaje: "" };
}

export function ProyectoFormModal({
  ventanaId,
  ciclosCentro,
  schoolId,
  onClose,
}: {
  ventanaId: string;
  ciclosCentro: { value: string; label: string }[];
  schoolId?: string;
  onClose: () => void;
}) {
  const router = useRouter();
  const [tipos, setTipos] = useState<TipoNotaFila[]>([filaVacia()]);
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const formRef = useRef<HTMLFormElement>(null);

  function actualizarTipo(index: number, campo: keyof TipoNotaFila, valor: string) {
    setTipos((prev) => prev.map((t, i) => (i === index ? { ...t, [campo]: valor } : t)));
  }

  function anadirTipo() {
    setTipos((prev) => [...prev, filaVacia()]);
  }

  function quitarTipo(index: number) {
    setTipos((prev) => (prev.length <= 1 ? prev : prev.filter((_, i) => i !== index)));
  }

  const totalPorcentaje = tipos.reduce((s, t) => s + (Number(t.porcentaje) || 0), 0);
  const porcentajeCompleto = tipos.length > 0 && Math.abs(totalPorcentaje - 100) < 0.01;

  function handleClose() {
    if (pending) return;
    onClose();
  }

  async function handleSubmit(formData: FormData) {
    setPending(true);
    setError(null);
    try {
      formData.set(
        "tiposNota",
        JSON.stringify(
          tipos
            .filter((t) => t.nombre.trim() || t.porcentaje.trim())
            .map((t) => ({ nombre: t.nombre.trim(), porcentaje: Number(t.porcentaje) || 0 }))
        )
      );
      formData.set("ventanaId", ventanaId);
      await crearProyecto(formData);
      router.refresh();
      onClose();
    } catch (e) {
      setError(e instanceof Error ? e.message : "No se pudo crear el proyecto.");
    } finally {
      setPending(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto bg-black/40 p-4">
      <div className="my-8 w-full max-w-lg rounded-2xl bg-white p-6 shadow-xl sm:p-8">
        <div className="mb-5 flex items-center justify-between">
          <h2 className="text-lg font-bold text-[#0B1D4D]">Nuevo proyecto</h2>
          <button onClick={handleClose} className="rounded p-1 text-slate-400 hover:bg-slate-100">
            <X className="h-4 w-4" />
          </button>
        </div>

        <form ref={formRef} action={handleSubmit} className="space-y-4">
          {error && <div className="rounded-lg bg-red-50 px-3 py-2.5 text-sm text-red-600">{error}</div>}
          {schoolId && <input type="hidden" name="schoolId" value={schoolId} />}

          <div>
            <label className="mb-1.5 block text-sm font-semibold text-slate-700">
              Ciclo <span className="text-red-500">*</span>
            </label>
            <select
              name="ciclo"
              required
              defaultValue=""
              className="w-full rounded-lg border border-slate-200 px-3 py-2.5 text-sm outline-none focus:border-[#FD5249]"
            >
              <option value="" disabled>
                Elige un ciclo...
              </option>
              {ciclosCentro.map((c) => (
                <option key={c.value} value={c.value}>
                  {c.label}
                </option>
              ))}
            </select>
            <p className="mt-1 text-xs text-slate-400">
              Cualquier profesor del centro podrá añadir después sus propios grupos dentro de este proyecto.
            </p>
          </div>

          <div>
            <div className="mb-1.5 flex items-center justify-between">
              <label className="block text-sm font-semibold text-slate-700">
                Tipos de nota (la rúbrica del proyecto) <span className="text-red-500">*</span>
              </label>
              <span
                className={`rounded-full px-2 py-0.5 text-[11px] font-semibold ${
                  porcentajeCompleto ? "bg-emerald-50 text-emerald-600" : "bg-amber-50 text-amber-600"
                }`}
              >
                {totalPorcentaje}% {porcentajeCompleto ? "✓" : "(tiene que sumar 100%)"}
              </span>
            </div>

            <div className="space-y-2">
              {tipos.map((t, i) => (
                <div key={i} className="grid grid-cols-[1fr_6rem_auto] items-start gap-2 rounded-lg border border-slate-100 p-2.5">
                  <input
                    required
                    value={t.nombre}
                    onChange={(e) => actualizarTipo(i, "nombre", e.target.value)}
                    placeholder="Nombre (ej. Memoria)"
                    className="rounded-lg border border-slate-200 px-2.5 py-2 text-xs outline-none focus:border-[#FD5249]"
                  />
                  <input
                    type="number"
                    required
                    min={0}
                    max={100}
                    value={t.porcentaje}
                    onChange={(e) => actualizarTipo(i, "porcentaje", e.target.value)}
                    placeholder="%"
                    className="rounded-lg border border-slate-200 px-2.5 py-2 text-xs outline-none focus:border-[#FD5249]"
                  />
                  <button
                    type="button"
                    onClick={() => quitarTipo(i)}
                    className="rounded-lg p-2 text-slate-400 hover:bg-red-50 hover:text-red-600"
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </button>
                </div>
              ))}
            </div>

            <button
              type="button"
              onClick={anadirTipo}
              className="mt-2 inline-flex items-center gap-1.5 rounded-lg border border-dashed border-slate-300 px-3 py-1.5 text-xs font-semibold text-slate-500 hover:border-[#FD5249] hover:text-[#FD5249]"
            >
              <Plus className="h-3.5 w-3.5" /> Añadir tipo de nota
            </button>
          </div>

          <div className="flex justify-end gap-2 pt-2">
            <button
              type="button"
              onClick={handleClose}
              className="rounded-lg border border-slate-200 px-4 py-2.5 text-sm font-semibold text-slate-600 hover:bg-slate-50"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={pending}
              className="inline-flex items-center gap-2 rounded-lg bg-[#FD5249] px-4 py-2.5 text-sm font-semibold text-white hover:bg-[#D7463E] disabled:opacity-60"
            >
              {pending && <ButtonSpinner />}
              {pending ? "Creando..." : "Crear proyecto"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
