"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { X } from "lucide-react";
import { crearEventoCalendarioEscolar, actualizarEventoCalendarioEscolar } from "./escolarActions";
import { ButtonSpinner } from "../components/ButtonSpinner";

export type EventoEditable = {
  id: string;
  titulo: string;
  fechaInicio: string;
  fechaFin: string;
  festivo: boolean;
};

export function CalendarioEscolarEventoModal({
  schoolId,
  editing,
  defaultFecha,
  onClose,
}: {
  schoolId?: string;
  editing: EventoEditable | null;
  defaultFecha?: string;
  onClose: () => void;
}) {
  const router = useRouter();
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  function handleClose() {
    if (pending) return;
    onClose();
  }

  async function handleSubmit(formData: FormData) {
    setPending(true);
    setError(null);
    try {
      if (editing) {
        await actualizarEventoCalendarioEscolar(editing.id, formData);
      } else {
        await crearEventoCalendarioEscolar(formData);
      }
      router.refresh();
      onClose();
    } catch (e) {
      setError(e instanceof Error ? e.message : "No se pudo guardar el evento.");
    } finally {
      setPending(false);
    }
  }

  const hoy = defaultFecha ?? new Date().toISOString().slice(0, 10);

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto bg-black/40 p-4">
      <div className="my-8 w-full max-w-md rounded-2xl bg-white p-6 shadow-xl sm:p-8">
        <div className="mb-5 flex items-center justify-between">
          <h2 className="text-lg font-bold text-[#0B1D4D]">{editing ? "Editar fecha" : "Nueva fecha"}</h2>
          <button onClick={handleClose} className="rounded p-1 text-slate-400 hover:bg-slate-100">
            <X className="h-4 w-4" />
          </button>
        </div>

        <form action={handleSubmit} className="space-y-4">
          {error && <div className="rounded-lg bg-red-50 px-3 py-2.5 text-sm text-red-600">{error}</div>}
          {schoolId && <input type="hidden" name="schoolId" value={schoolId} />}

          <div>
            <label className="mb-1.5 block text-sm font-semibold text-slate-700">
              Título <span className="text-red-500">*</span>
            </label>
            <input
              name="titulo"
              required
              defaultValue={editing?.titulo ?? ""}
              placeholder="Ej. Setmana d'exàmens 1T - 2n batxillerat"
              className="w-full rounded-lg border border-slate-200 px-3 py-2.5 text-sm outline-none focus:border-[#FD5249]"
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="mb-1.5 block text-sm font-semibold text-slate-700">
                Desde <span className="text-red-500">*</span>
              </label>
              <input
                name="fechaInicio"
                type="date"
                required
                defaultValue={editing?.fechaInicio.slice(0, 10) ?? hoy}
                className="w-full rounded-lg border border-slate-200 px-3 py-2.5 text-sm outline-none focus:border-[#FD5249]"
              />
            </div>
            <div>
              <label className="mb-1.5 block text-sm font-semibold text-slate-700">Hasta</label>
              <input
                name="fechaFin"
                type="date"
                defaultValue={editing?.fechaFin.slice(0, 10) ?? hoy}
                placeholder="Igual que Desde si no es un rango"
                className="w-full rounded-lg border border-slate-200 px-3 py-2.5 text-sm outline-none focus:border-[#FD5249]"
              />
            </div>
          </div>
          <p className="-mt-2 text-xs text-slate-400">Deja &quot;Hasta&quot; igual que &quot;Desde&quot; si es un único día.</p>

          <label className="flex items-center gap-2 text-sm text-slate-600">
            <input
              type="checkbox"
              name="festivo"
              defaultChecked={editing?.festivo ?? false}
              className="rounded border-slate-300 accent-[#FD5249]"
            />
            Es festivo / no lectivo
          </label>

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
              {pending ? "Guardando..." : "Guardar"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
