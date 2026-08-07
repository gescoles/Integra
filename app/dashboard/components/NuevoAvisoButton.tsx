"use client";

import { useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Plus, X } from "lucide-react";
import { createAviso } from "./avisosActions";
import { ButtonSpinner } from "./ButtonSpinner";

export function NuevoAvisoButton() {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();
  const formRef = useRef<HTMLFormElement>(null);

  async function handleSubmit(formData: FormData) {
    setError(null);
    startTransition(async () => {
      try {
        await createAviso(formData);
        setOpen(false);
        formRef.current?.reset();
        router.refresh();
      } catch (e) {
        setError(e instanceof Error ? e.message : "No se pudo publicar el aviso.");
      }
    });
  }

  return (
    <>
      <button
        onClick={() => setOpen(true)}
        className="inline-flex items-center gap-1.5 rounded-lg bg-[#FD5249] px-3 py-1.5 text-xs font-semibold text-white hover:bg-[#D7463E]"
      >
        <Plus className="h-3.5 w-3.5" /> Nuevo aviso
      </button>

      {open && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 px-4">
          <div className="w-full max-w-md rounded-2xl bg-white p-6 shadow-xl">
            <div className="mb-5 flex items-center justify-between">
              <h2 className="text-lg font-bold text-[#0B1D4D]">Nuevo aviso del centro</h2>
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

            <form ref={formRef} action={handleSubmit} className="space-y-4">
              <div>
                <label className="mb-1.5 block text-sm font-semibold text-slate-700">Título</label>
                <input
                  name="titulo"
                  required
                  placeholder="Ej. Reunión claustro ordinario"
                  className="w-full rounded-lg border border-slate-200 px-3 py-2.5 text-sm outline-none focus:border-[#FD5249]"
                />
              </div>

              <div>
                <label className="mb-1.5 block text-sm font-semibold text-slate-700">Categoría</label>
                <select
                  name="categoria"
                  defaultValue="GENERAL"
                  className="w-full rounded-lg border border-slate-200 px-3 py-2.5 text-sm outline-none focus:border-[#FD5249]"
                >
                  <option value="GENERAL">General</option>
                  <option value="ACADEMICO">Académico</option>
                  <option value="CONVIVENCIA">Convivencia</option>
                </select>
              </div>

              <div>
                <label className="mb-1.5 block text-sm font-semibold text-slate-700">Contenido</label>
                <textarea
                  name="cuerpo"
                  required
                  rows={3}
                  placeholder="Escribe el aviso..."
                  className="w-full rounded-lg border border-slate-200 px-3 py-2.5 text-sm outline-none focus:border-[#FD5249]"
                />
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
                  className="inline-flex items-center gap-2 rounded-lg bg-[#FD5249] px-4 py-2.5 text-sm font-semibold text-white hover:bg-[#D7463E] disabled:opacity-60"
                >
                  {pending && <ButtonSpinner />}
                  {pending ? "Publicando..." : "Publicar aviso"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </>
  );
}
