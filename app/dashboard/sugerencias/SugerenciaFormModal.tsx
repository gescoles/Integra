"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { X } from "lucide-react";
import { crearSugerencia } from "./actions";
import { ButtonSpinner } from "../components/ButtonSpinner";

const DETALLE_MAX = 2000;

export function SugerenciaFormModal({
  departamentos,
  schoolId,
  onClose,
}: {
  departamentos: { id: string; nombre: string }[];
  schoolId?: string;
  onClose: () => void;
}) {
  const router = useRouter();
  const [detalle, setDetalle] = useState("");
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
      await crearSugerencia(formData);
      router.refresh();
      onClose();
    } catch (e) {
      setError(e instanceof Error ? e.message : "No se pudo enviar la sugerencia.");
    } finally {
      setPending(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto bg-black/40 p-4">
      <div className="my-8 w-full max-w-lg rounded-2xl bg-white p-6 shadow-xl sm:p-8">
        <div className="mb-5 flex items-center justify-between">
          <h2 className="text-lg font-bold text-[#0B1D4D]">Nueva sugerencia</h2>
          <button onClick={handleClose} className="rounded p-1 text-slate-400 hover:bg-slate-100">
            <X className="h-4 w-4" />
          </button>
        </div>

        <p className="mb-4 rounded-lg bg-blue-50 px-3 py-2.5 text-xs text-slate-600">
          Esta sugerencia es <strong>anónima</strong>: ni siquiera el equipo directivo verá quién la ha
          escrito, solo el contenido.
        </p>

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
              placeholder="Ej. Más enchufes en la sala de profesores"
              className="w-full rounded-lg border border-slate-200 px-3 py-2.5 text-sm outline-none focus:border-[#FD5249]"
            />
          </div>

          <div>
            <label className="mb-1.5 block text-sm font-semibold text-slate-700">Departamento</label>
            <select
              name="departamentoId"
              defaultValue=""
              className="w-full rounded-lg border border-slate-200 px-3 py-2.5 text-sm outline-none focus:border-[#FD5249]"
            >
              <option value="">Sin departamento concreto</option>
              {departamentos.map((d) => (
                <option key={d.id} value={d.id}>
                  {d.nombre}
                </option>
              ))}
            </select>
          </div>

          <div>
            <div className="mb-1.5 flex items-center justify-between">
              <label className="block text-sm font-semibold text-slate-700">
                Detalles <span className="text-red-500">*</span>
              </label>
              <span className={`text-xs ${detalle.length > DETALLE_MAX ? "text-red-500" : "text-slate-400"}`}>
                {detalle.length}/{DETALLE_MAX}
              </span>
            </div>
            <textarea
              name="detalle"
              required
              rows={6}
              maxLength={DETALLE_MAX}
              value={detalle}
              onChange={(e) => setDetalle(e.target.value)}
              placeholder="Explica con detalle tu sugerencia..."
              className="w-full rounded-lg border border-slate-200 px-3 py-2.5 text-sm outline-none focus:border-[#FD5249]"
            />
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
              {pending ? "Enviando..." : "Enviar sugerencia"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
