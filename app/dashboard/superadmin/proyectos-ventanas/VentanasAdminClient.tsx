"use client";

import { useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { Plus, Pencil, Trash2, X, Layers } from "lucide-react";
import { crearVentana, renombrarVentana, eliminarVentana } from "./actions";
import { ButtonSpinner } from "../../components/ButtonSpinner";

type Ventana = { id: string; nombre: string; numProyectos: number };

export function VentanasAdminClient({ ventanas }: { ventanas: Ventana[] }) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<Ventana | null>(null);
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const formRef = useRef<HTMLFormElement>(null);

  function openNueva() {
    setEditing(null);
    setError(null);
    setOpen(true);
  }

  function openEditar(v: Ventana) {
    setEditing(v);
    setError(null);
    setOpen(true);
  }

  function handleClose() {
    if (pending) return;
    setOpen(false);
    setEditing(null);
    formRef.current?.reset();
  }

  async function handleSubmit(formData: FormData) {
    setPending(true);
    setError(null);
    try {
      if (editing) {
        await renombrarVentana(editing.id, formData.get("nombre") as string);
      } else {
        await crearVentana(formData);
      }
      router.refresh();
      handleClose();
    } catch (e) {
      setError(e instanceof Error ? e.message : "No se pudo guardar.");
    } finally {
      setPending(false);
    }
  }

  async function handleEliminar(v: Ventana) {
    if (!confirm(`¿Eliminar la ventana "${v.nombre}"?`)) return;
    try {
      await eliminarVentana(v.id);
      router.refresh();
    } catch (e) {
      alert(e instanceof Error ? e.message : "No se pudo eliminar.");
    }
  }

  return (
    <div>
      <div className="mb-4 flex items-center justify-between">
        <h2 className="text-sm font-bold text-[#0B1D4D]">Ventanas ({ventanas.length})</h2>
        <button
          onClick={openNueva}
          className="inline-flex items-center gap-1.5 rounded-lg bg-[#FD5249] px-4 py-2.5 text-sm font-semibold text-white hover:bg-[#D7463E]"
        >
          <Plus className="h-4 w-4" /> Nueva ventana
        </button>
      </div>

      {ventanas.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-slate-300 bg-white py-16 text-center text-sm text-slate-400">
          Todavía no hay ninguna ventana creada.
        </div>
      ) : (
        <div className="space-y-2.5">
          {ventanas.map((v) => (
            <div key={v.id} className="flex items-center justify-between gap-3 rounded-2xl border border-slate-200 bg-white p-4">
              <div className="flex min-w-0 items-center gap-3">
                <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-purple-50">
                  <Layers className="h-4 w-4 text-purple-600" />
                </div>
                <div className="min-w-0">
                  <div className="truncate text-sm font-semibold text-slate-700">{v.nombre}</div>
                  <div className="text-xs text-slate-400">
                    {v.numProyectos} proyecto{v.numProyectos === 1 ? "" : "s"} creado{v.numProyectos === 1 ? "" : "s"}
                  </div>
                </div>
              </div>
              <div className="flex shrink-0 gap-1">
                <button onClick={() => openEditar(v)} className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-100 hover:text-[#FD5249]">
                  <Pencil className="h-3.5 w-3.5" />
                </button>
                <button onClick={() => handleEliminar(v)} className="rounded-lg p-1.5 text-slate-400 hover:bg-red-50 hover:text-red-600">
                  <Trash2 className="h-3.5 w-3.5" />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {open && (
        <div className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto bg-black/40 p-4">
          <div className="my-8 w-full max-w-md rounded-2xl bg-white p-6 shadow-xl">
            <div className="mb-5 flex items-center justify-between">
              <h2 className="text-lg font-bold text-[#0B1D4D]">{editing ? "Renombrar ventana" : "Nueva ventana"}</h2>
              <button onClick={handleClose} className="rounded p-1 text-slate-400 hover:bg-slate-100">
                <X className="h-4 w-4" />
              </button>
            </div>

            <form ref={formRef} action={handleSubmit} className="space-y-4">
              {error && <div className="rounded-lg bg-red-50 px-3 py-2.5 text-sm text-red-600">{error}</div>}

              <div>
                <label className="mb-1.5 block text-sm font-semibold text-slate-700">
                  Nombre <span className="text-red-500">*</span>
                </label>
                <input
                  name="nombre"
                  required
                  defaultValue={editing?.nombre ?? ""}
                  placeholder="Ej. Proyecto Optativo"
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
                  {pending ? "Guardando..." : "Guardar"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
